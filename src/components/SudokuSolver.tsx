import React, { useState, useCallback, useEffect } from 'react';
import { Upload, Camera, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Define the interface for the recognized grid
interface SudokuGrid {
  grid: number[][];
}

const SudokuSolver: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recognizedGrid, setRecognizedGrid] = useState<number[][] | null>(null);
  const [solvedGrid, setSolvedGrid] = useState<number[][] | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleImageSelect = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Please select a valid image file');
      return;
    }

    setSelectedImage(file);
    const reader = new FileReader();
    reader.onload = (e) => {
      setImagePreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    setRecognizedGrid(null); // Reset both grids on new image select
    setSolvedGrid(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleImageSelect(files[0]);
    }
  }, [handleImageSelect]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  // This is the Sudoku solving function, which now runs on the frontend
  const solveSudoku = (grid: number[][]): number[][] | null => {
    const board = grid.map(row => [...row]);
    
    const isValid = (board: number[][], row: number, col: number, num: number): boolean => {
      for (let i = 0; i < 9; i++) {
        if (board[row][i] === num) return false;
      }
      for (let i = 0; i < 9; i++) {
        if (board[i][col] === num) return false;
      }
      const boxRow = Math.floor(row / 3) * 3;
      const boxCol = Math.floor(col / 3) * 3;
      for (let i = boxRow; i < boxRow + 3; i++) {
        for (let j = boxCol; j < boxCol + 3; j++) {
          if (board[i][j] === num) return false;
        }
      }
      return true;
    };

    const solve = (board: number[][]): boolean => {
      for (let row = 0; row < 9; row++) {
        for (let col = 0; col < 9; col++) {
          if (board[row][col] === 0) {
            for (let num = 1; num <= 9; num++) {
              if (isValid(board, row, col, num)) {
                board[row][col] = num;
                if (solve(board)) return true;
                board[row][col] = 0;
              }
            }
            return false;
          }
        }
      }
      return true;
    };

    if (solve(board)) {
      return board;
    }
    return null;
  };

  // This function recognizes the grid by calling the new API route
  const handleRecognizePuzzle = async () => {
    if (!selectedImage || !imagePreview) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    try {
      toast.info('Sending image to server for recognition...');
      
      const response = await fetch('/api/recognize-sudoku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: imagePreview }),
      });

      if (!response.ok) {
        throw new Error('Failed to recognize puzzle on the server.');
      }

      const data: { recognizedGrid: number[][] } = await response.json();
      setRecognizedGrid(data.recognizedGrid);
      toast.success('Puzzle recognized successfully!');
    } catch (error) {
      console.error('Error recognizing puzzle:', error);
      toast.error('Failed to process the puzzle. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // This effect will run when a recognized grid is available
  useEffect(() => {
    if (recognizedGrid) {
      toast.info('Solving puzzle locally...');
      const solution = solveSudoku(recognizedGrid);
      
      if (solution) {
        setSolvedGrid(solution);
        toast.success('Puzzle solved successfully!');
      } else {
        toast.error('No solution found for this puzzle');
      }
    }
  }, [recognizedGrid]);


  const renderSudokuGrid = (grid: number[][], isSolved: boolean) => {
    return (
      <div className="grid grid-cols-9 gap-0 w-full max-w-lg mx-auto border-2 border-primary rounded-lg overflow-hidden bg-card shadow-card">
        {grid.map((row, rowIndex) =>
          row.map((cell, colIndex) => (
            <div
              key={`${rowIndex}-${colIndex}`}
              className={cn(
                "aspect-square flex items-center justify-center text-lg font-semibold border border-border bg-card",
                {
                  "border-r-2 border-r-primary": (colIndex + 1) % 3 === 0 && colIndex !== 8,
                  "border-b-2 border-b-primary": (rowIndex + 1) % 3 === 0 && rowIndex !== 8,
                }
              )}
            >
              {cell !== 0 && (
                <span className={cn({ "text-foreground": !isSolved, "text-green-500": isSolved })}>{cell}</span>
              )}
            </div>
          ))
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-background">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Sudoku Solver
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Upload an image of a Sudoku puzzle and let AI solve it for you.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          <Card className="shadow-card">
            <CardContent className="p-8">
              <div
                className={cn(
                  "border-2 border-dashed rounded-lg p-8 text-center transition-all duration-300 cursor-pointer",
                  isDragOver 
                    ? "border-primary bg-primary/5 scale-105" 
                    : "border-muted-foreground/30 hover:border-primary hover:bg-primary/5"
                )}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => document.getElementById('image-upload')?.click()}
              >
                <input
                  id="image-upload"
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleImageSelect(file);
                  }}
                  className="hidden"
                />
                
                <div className="space-y-4">
                  <div className="flex justify-center">
                    <div className="p-4 bg-primary/10 rounded-full">
                      <Upload className="w-8 h-8 text-primary" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold mb-2">Upload Sudoku Image</h3>
                    <p className="text-muted-foreground">
                      Drag and drop your Sudoku puzzle image here, or click to browse
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Display areas for image and grids */}
          {(imagePreview || recognizedGrid) && (
            <Card className="shadow-card">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Image Preview */}
                  {imagePreview && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Original Puzzle</h3>
                      <div className="rounded-lg overflow-hidden shadow-lg">
                        <img
                          src={imagePreview}
                          alt="Sudoku puzzle"
                          className="w-full h-auto max-h-96 object-contain bg-muted"
                        />
                      </div>
                    </div>
                  )}

                  {/* Recognized Grid */}
                  {recognizedGrid && !solvedGrid && (
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold">Recognized Grid</h3>
                      {renderSudokuGrid(recognizedGrid, false)}
                    </div>
                  )}

                  {/* Solved Grid */}
                  {solvedGrid && (
                    <div className="space-y-4 md:col-span-2">
                      <div className="flex items-center gap-2 justify-center">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <h3 className="text-lg font-semibold">Solved Puzzle</h3>
                      </div>
                      {renderSudokuGrid(solvedGrid, true)}
                    </div>
                  )}
                </div>

                {/* Button to trigger recognition */}
                {imagePreview && !recognizedGrid && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="solve"
                      size="lg"
                      onClick={handleRecognizePuzzle}
                      disabled={isProcessing}
                      className="min-w-48"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Recognizing...
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          Recognize Puzzle
                        </>
                      )}
                    </Button>
                  </div>
                )}
                
                {/* Reset Button */}
                {recognizedGrid && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
                        setRecognizedGrid(null);
                        setSolvedGrid(null);
                      }}
                    >
                      Solve Another Puzzle
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default SudokuSolver;
