import React, { useState, useEffect, useCallback, useRef } from 'react';

// Letter frequency distribution to bias toward common letters
const LETTER_FREQUENCIES = {
  A: 9, B: 2, C: 2, D: 4, E: 12, F: 2, G: 3, H: 2, I: 9,
  J: 1, K: 1, L: 4, M: 2, N: 6, O: 8, P: 2, Q: 1, R: 6,
  S: 4, T: 6, U: 4, V: 2, W: 2, X: 1, Y: 2, Z: 1
};

// Scrabble letter values
const LETTER_VALUES = {
  A: 1, B: 3, C: 3, D: 2, E: 1, F: 4, G: 2, H: 4, I: 1,
  J: 8, K: 5, L: 1, M: 3, N: 1, O: 1, P: 3, Q: 10, R: 1,
  S: 1, T: 1, U: 1, V: 4, W: 4, X: 8, Y: 4, Z: 10
};

// Utility function for class name merging
const cn = (...classes) => classes.filter(Boolean).join(' ');

// ShootingStars component for background animation
const ShootingStars = ({
  minSpeed = 10,
  maxSpeed = 30,
  minDelay = 1200,
  maxDelay = 4200,
  starColor = "#9E00FF",
  trailColor = "#2EB9DF",
  starWidth = 10,
  starHeight = 1,
  className,
}) => {
  const [star, setStar] = useState(null);
  const svgRef = useRef(null);

  const getRandomStartPoint = () => {
    const side = Math.floor(Math.random() * 4);
    const offset = Math.random() * window.innerWidth;

    switch (side) {
      case 0:
        return { x: offset, y: 0, angle: 45 };
      case 1:
        return { x: window.innerWidth, y: offset, angle: 135 };
      case 2:
        return { x: offset, y: window.innerHeight, angle: 225 };
      case 3:
        return { x: 0, y: offset, angle: 315 };
      default:
        return { x: 0, y: 0, angle: 45 };
    }
  };

  useEffect(() => {
    const createStar = () => {
      const { x, y, angle } = getRandomStartPoint();
      const newStar = {
        id: Date.now(),
        x,
        y,
        angle,
        scale: 1,
        speed: Math.random() * (maxSpeed - minSpeed) + minSpeed,
        distance: 0,
      };
      setStar(newStar);

      const randomDelay = Math.random() * (maxDelay - minDelay) + minDelay;
      setTimeout(createStar, randomDelay);
    };

    createStar();

    return () => {};
  }, [minSpeed, maxSpeed, minDelay, maxDelay]);

  useEffect(() => {
    const moveStar = () => {
      if (star) {
        setStar((prevStar) => {
          if (!prevStar) return null;
          const newX =
            prevStar.x +
            prevStar.speed * Math.cos((prevStar.angle * Math.PI) / 180);
          const newY =
            prevStar.y +
            prevStar.speed * Math.sin((prevStar.angle * Math.PI) / 180);
          const newDistance = prevStar.distance + prevStar.speed;
          const newScale = 1 + newDistance / 100;
          if (
            newX < -20 ||
            newX > window.innerWidth + 20 ||
            newY < -20 ||
            newY > window.innerHeight + 20
          ) {
            return null;
          }
          return {
            ...prevStar,
            x: newX,
            y: newY,
            distance: newDistance,
            scale: newScale,
          };
        });
      }
    };

    const animationFrame = requestAnimationFrame(moveStar);
    return () => cancelAnimationFrame(animationFrame);
  }, [star]);

  return (
    <svg
      ref={svgRef}
      className={cn("w-full h-full absolute inset-0", className)}
    >
      {star && (
        <rect
          key={star.id}
          x={star.x}
          y={star.y}
          width={starWidth * star.scale}
          height={starHeight}
          fill="url(#gradient)"
          transform={`rotate(${star.angle}, ${
            star.x + (starWidth * star.scale) / 2
          }, ${star.y + starHeight / 2})`}
        />
      )}
      <defs>
        <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{ stopColor: trailColor, stopOpacity: 0 }} />
          <stop
            offset="100%"
            style={{ stopColor: starColor, stopOpacity: 1 }}
          />
        </linearGradient>
      </defs>
    </svg>
  );
};

// Main game component
const LetterDropGame = () => {
  // Game state variables
  const [grid, setGrid] = useState(Array(8).fill().map(() => Array(8).fill(null)));
  const [currentLetter, setCurrentLetter] = useState('');
  const [nextLetter, setNextLetter] = useState('');
  const [selectedColumn, setSelectedColumn] = useState(3);
  const [selectedCells, setSelectedCells] = useState([]);
  const [score, setScore] = useState(0);
  const [deleteChances, setDeleteChances] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [wordStatus, setWordStatus] = useState(null); // null, 'valid', or 'invalid'
  const [wordDictionary, setWordDictionary] = useState({});
  const [isDictionaryLoaded, setIsDictionaryLoaded] = useState(false);

  // Generate a random letter based on frequency
  const generateRandomLetter = useCallback(() => {
    const letters = [];
    Object.entries(LETTER_FREQUENCIES).forEach(([letter, frequency]) => {
      for (let i = 0; i < frequency; i++) {
        letters.push(letter);
      }
    });
    const randomIndex = Math.floor(Math.random() * letters.length);
    return letters[randomIndex];
  }, []);

  // Initialize current and next letters on mount
  useEffect(() => {
    if (!currentLetter) {
      setCurrentLetter(generateRandomLetter());
      setNextLetter(generateRandomLetter());
    }
  }, [currentLetter, generateRandomLetter]);

  // Fetch the word dictionary from public folder
  useEffect(() => {
    fetch('/words_dictionary.json')
      .then(response => response.json())
      .then(data => {
        setWordDictionary(data);
        setIsDictionaryLoaded(true);
      })
      .catch(error => console.error('Error loading dictionary:', error));
  }, []);

  // Check if the game is over
  const checkGameOver = useCallback((currentGrid) => {
    const isGameOver = currentGrid.every(column => column[0] !== null);
    setGameOver(isGameOver);
  }, []);

  // Drop the current letter into the selected column
  const dropLetter = useCallback(() => {
    if (gameOver) return;

    const newGrid = [...grid];
    const column = newGrid[selectedColumn];
    let rowIndex = 7;
    while (rowIndex >= 0 && column[rowIndex] !== null) {
      rowIndex--;
    }
    if (rowIndex < 0) return;

    column[rowIndex] = currentLetter;
    setGrid(newGrid);
    checkGameOver(newGrid);
    setCurrentLetter(nextLetter);
    setNextLetter(generateRandomLetter());
  }, [gameOver, grid, selectedColumn, currentLetter, nextLetter, generateRandomLetter, checkGameOver]);

  // Handle keyboard controls
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (gameOver) return;
      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          setSelectedColumn(prev => Math.max(0, prev - 1));
          break;
        case 'ArrowRight':
          e.preventDefault();
          setSelectedColumn(prev => Math.min(7, prev + 1));
          break;
        case 'ArrowDown':
        case ' ':
          e.preventDefault();
          dropLetter();
          break;
        default:
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameOver, dropLetter]);

  // Word selection handlers
  const handleCellMouseDown = (colIndex, rowIndex) => {
    if (grid[colIndex][rowIndex] === null) return;
    setIsDragging(true);
    setSelectedCells([{ col: colIndex, row: rowIndex }]);
  };

  const handleCellMouseEnter = (colIndex, rowIndex) => {
    if (!isDragging || grid[colIndex][rowIndex] === null) return;
    const lastCell = selectedCells[selectedCells.length - 1];
    const isAdjacent =
      (Math.abs(colIndex - lastCell.col) <= 1 && Math.abs(rowIndex - lastCell.row) <= 1);
    if (isAdjacent && !selectedCells.some(cell => cell.col === colIndex && cell.row === rowIndex)) {
      setSelectedCells([...selectedCells, { col: colIndex, row: rowIndex }]);
    }
  };

  const handleMouseUp = () => setIsDragging(false);

  const getSelectedWord = () =>
    selectedCells.map(cell => grid[cell.col][cell.row]).join('').toLowerCase();

  // Submit the selected word
  const submitWord = () => {
    const word = getSelectedWord();
    console.log("Submitting word:", word);

    if (word.length < 3) {
      setWordStatus('invalid');
      setTimeout(() => setWordStatus(null), 800);
      return;
    }

    if (wordDictionary[word]) {
      setWordStatus('valid');
      console.log("Word is valid!");
      const wordScore = selectedCells.reduce(
        (sum, cell) => sum + LETTER_VALUES[grid[cell.col][cell.row]],
        0
      );
      const newScore = score + wordScore;
      setScore(newScore);
      console.log("New score:", newScore);

      const newDeleteChances = Math.floor(newScore / 10) - Math.floor(score / 10);
      if (newDeleteChances > 0) setDeleteChances(prev => prev + newDeleteChances);

      const newGrid = JSON.parse(JSON.stringify(grid));
      selectedCells.forEach(cell => {
        for (let row = cell.row; row > 0; row--) {
          newGrid[cell.col][row] = newGrid[cell.col][row - 1];
        }
        newGrid[cell.col][0] = null;
      });
      setGrid(newGrid);
      setTimeout(() => setWordStatus(null), 800);
    } else {
      console.log("Word is invalid!");
      setWordStatus('invalid');
      setTimeout(() => setWordStatus(null), 800);
    }
    setSelectedCells([]);
  };

  // Use delete chance to remove a letter
  const useDeleteChance = () => {
    if (deleteChances <= 0 || selectedCells.length !== 1) return;
    const cell = selectedCells[0];
    if (grid[cell.col][cell.row] === null) return;

    const newGrid = [...grid];
    for (let row = cell.row; row > 0; row--) {
      newGrid[cell.col][row] = newGrid[cell.col][row - 1];
    }
    newGrid[cell.col][0] = null;
    setGrid(newGrid);
    setDeleteChances(prev => prev - 1);
    setSelectedCells([]);
  };

  // Reset the game
  const resetGame = () => {
    setGrid(Array(8).fill().map(() => Array(8).fill(null)));
    setCurrentLetter(generateRandomLetter());
    setNextLetter(generateRandomLetter());
    setSelectedColumn(3);
    setSelectedCells([]);
    setScore(0);
    setDeleteChances(0);
    setGameOver(false);
    setWordStatus(null);
  };

  // Render the game UI
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black p-4 relative overflow-hidden">
      {/* Background */}
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.15)_0%,rgba(0,0,0,0)_80%)]" />
        <div className="stars absolute inset-0" />
      </div>

      {/* Shooting stars */}
      <ShootingStars starColor="#9E00FF" trailColor="#2EB9DF" minSpeed={15} maxSpeed={35} minDelay={1000} maxDelay={3000} />
      <ShootingStars starColor="#FF0099" trailColor="#FFB800" minSpeed={10} maxSpeed={25} minDelay={2000} maxDelay={4000} />
      <ShootingStars starColor="#00FF9E" trailColor="#00B8FF" minSpeed={20} maxSpeed={40} minDelay={1500} maxDelay={3500} />

      {/* Loading message */}
      {!isDictionaryLoaded && <p className="text-white">Loading dictionary...</p>}

      <h1 className="text-3xl font-bold mb-4 text-white relative z-10">Letter Drop</h1>

      {/* Score and next letter */}
      <div className="mb-4 flex items-center justify-between w-full max-w-md relative z-10">
        <div>
          <p className="text-lg font-semibold text-white">Score: {score}</p>
          <p className="text-white">Delete Chances: {deleteChances}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="mb-1 text-white">Next:</p>
          <div className="w-8 h-8 flex items-center justify-center bg-gray-200 rounded">
            {nextLetter}
          </div>
        </div>
      </div>

      {/* Current letter */}
      <div className="relative mb-4 w-96 flex justify-start h-12">
        <div
          className="w-12 h-12 flex flex-col items-center justify-center bg-blue-500 text-white font-bold rounded-full text-xl absolute bottom-0 transition-all duration-150"
          style={{ left: `${selectedColumn * 48}px` }}
        >
          <span className="leading-none">{currentLetter}</span>
          <span className="text-xs leading-none mt-1">{LETTER_VALUES[currentLetter]}</span>
        </div>
      </div>

      {/* Game grid */}
      <div
        className="relative w-96 bg-white bg-opacity-10 rounded shadow-lg overflow-hidden backdrop-blur-sm z-10"
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div className="flex flex-row w-96">
          {grid.map((column, colIndex) => (
            <div key={colIndex} className="flex flex-col w-12">
              {column.map((cell, rowIndex) => {
                const isSelected = selectedCells.some(
                  selectedCell => selectedCell.col === colIndex && selectedCell.row === rowIndex
                );
                const cellStyle = isSelected
                  ? wordStatus === 'valid'
                    ? 'bg-green-300 bg-opacity-70'
                    : wordStatus === 'invalid'
                      ? 'bg-red-300 bg-opacity-70'
                      : 'bg-blue-200 bg-opacity-70'
                  : 'bg-black bg-opacity-40';
                return (
                  <div
                    key={`${colIndex}-${rowIndex}`}
                    className={`w-12 h-12 flex items-center justify-center border border-gray-700 cursor-pointer ${cellStyle}`}
                    onMouseDown={() => handleCellMouseDown(colIndex, rowIndex)}
                    onMouseEnter={() => handleCellMouseEnter(colIndex, rowIndex)}
                    onClick={() => setSelectedColumn(colIndex)}
                  >
                    {cell && (
                      <div className="w-10 h-10 rounded-full bg-blue-500 text-white flex flex-col items-center justify-center shadow-lg">
                        <span className="text-lg font-bold leading-none">{cell}</span>
                        <span className="text-xs leading-none mt-1">{LETTER_VALUES[cell]}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
        <div
          className="absolute top-0 w-12 h-full bg-yellow-100 opacity-30 pointer-events-none transition-all duration-150"
          style={{ left: `${selectedColumn * 3}rem` }}
        />
        <div className="absolute top-0 left-0 w-full">
          {grid.map((column, colIndex) => (
            column[0] !== null && (
              <div
                key={`full-${colIndex}`}
                className="absolute top-0 text-xs text-white bg-red-500 p-1"
                style={{ left: `${colIndex * 3}rem` }}
              >
                Full
              </div>
            )
          ))}
        </div>
      </div>

      {/* Buttons */}
      <div className="mt-4 flex space-x-4 relative z-10">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded shadow-lg"
          onClick={dropLetter}
          disabled={gameOver || grid[selectedColumn][0] !== null}
        >
          Drop
        </button>
        <button
          className={`bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded shadow-lg ${
            selectedCells.length < 3 || !isDictionaryLoaded ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={submitWord}
          disabled={selectedCells.length < 3 || !isDictionaryLoaded}
        >
          Submit Word
        </button>
        <button
          className={`bg-rose-600 hover:bg-rose-700 text-white px-4 py-2 rounded shadow-lg ${
            deleteChances <= 0 || selectedCells.length !== 1 ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          onClick={useDeleteChance}
          disabled={deleteChances <= 0 || selectedCells.length !== 1}
        >
          Delete ({deleteChances})
        </button>
      </div>

      {/* Game over */}
      {gameOver && (
        <div className="mt-6 p-4 bg-gray-800 bg-opacity-80 backdrop-blur-sm text-white rounded text-center shadow-lg relative z-10">
          <h2 className="text-2xl font-bold mb-2">Game Over!</h2>
          <p className="text-xl">Final Score: {score}</p>
          <button
            className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded"
            onClick={resetGame}
          >
            Play Again
          </button>
        </div>
      )}

      {/* Instructions */}
      <div className="mt-6 p-4 bg-gray-800 bg-opacity-60 backdrop-blur-sm rounded max-w-md text-sm text-white shadow-lg relative z-10">
        <h3 className="font-bold mb-2">How to Play:</h3>
        <ul className="list-disc pl-4">
          <li>Use arrow keys or click to move the current letter</li>
          <li>Press Down/Space or click Drop to place the letter</li>
          <li>Click and drag to select letters (at least 3) to form words</li>
          <li>Click Submit to clear words and earn points</li>
          <li>Earn Delete Chances for every 10 points</li>
          <li>Game ends when all columns are full</li>
        </ul>
      </div>

      {/* Background styles */}
      <style jsx>{`
        .stars {
          background-image: 
            radial-gradient(2px 2px at 20px 30px, #eee, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 40px 70px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 50px 160px, #ddd, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 90px 40px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 130px 80px, #fff, rgba(0,0,0,0)),
            radial-gradient(2px 2px at 160px 120px, #ddd, rgba(0,0,0,0));
          background-repeat: repeat;
          background-size: 200px 200px;
          animation: twinkle 5s ease-in-out infinite;
          opacity: 0.5;
        }
        @keyframes twinkle {
          0% { opacity: 0.5; }
          50% { opacity: 0.8; }
          100% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
};

export default LetterDropGame;
