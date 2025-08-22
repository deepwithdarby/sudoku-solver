import React, { useState, useCallback } from 'react';
import { Upload, Camera, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface SudokuGrid {
  grid: number[][];
}

const SudokuSolver: React.FC = () => {
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
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

  const recognizeSudoku = async (imageBase64: string): Promise<number[][]> => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('VITE_GEMINI_API_KEY is not set in the environment.');
    }
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            {
              text: "Analyze this Sudoku puzzle image and extract the numbers in a 9x9 grid format. Return ONLY a JSON array of arrays representing the grid, where empty cells are represented as 0. For example: [[5,3,0,0,7,0,0,0,0],[6,0,0,1,9,5,0,0,0],...]. Do not include any other text, explanations, or formatting - just the raw JSON array."
            },
            {
              inline_data: {
                mime_type: "image/jpeg",
                data: imageBase64.split(',')[1]
              }
            }
          ]
        }]
      })
    });

    if (!response.ok) {
      throw new Error('Failed to analyze image with Gemini API');
    }

    const data = await response.json();
    const text = data.candidates[0].content.parts[0].text;
    
    try {
      // Remove markdown code blocks if present
      let cleanedText = text.trim();
      if (cleanedText.startsWith('```json')) {
        cleanedText = cleanedText.replace(/```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedText.startsWith('```')) {
        cleanedText = cleanedText.replace(/```\s*/, '').replace(/\s*```$/, '');
      }
      
      const grid = JSON.parse(cleanedText);
      if (!Array.isArray(grid) || grid.length !== 9 || !grid.every(row => Array.isArray(row) && row.length === 9)) {
        throw new Error('Invalid grid format');
      }
      return grid;
    } catch (error) {
      throw new Error('Failed to parse Sudoku grid from AI response');
    }
  };

  const solveSudoku = (grid: number[][]): number[][] | null => {
    const board = grid.map(row => [...row]);
    
    const isValid = (board: number[][], row: number, col: number, num: number): boolean => {
      // Check row
      for (let i = 0; i < 9; i++) {
        if (board[row][i] === num) return false;
      }
      
      // Check column
      for (let i = 0; i < 9; i++) {
        if (board[i][col] === num) return false;
      }
      
      // Check 3x3 box
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

  const handleSolvePuzzle = async () => {
    if (!selectedImage || !imagePreview) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    try {
      toast.info('Analyzing image with AI...');
      const recognizedGrid = await recognizeSudoku(imagePreview);
      
      toast.info('Solving puzzle...');
      const solution = solveSudoku(recognizedGrid);
      
      if (solution) {
        setSolvedGrid(solution);
        toast.success('Puzzle solved successfully!');
      } else {
        toast.error('No solution found for this puzzle');
      }
    } catch (error) {
      console.error('Error solving puzzle:', error);
      toast.error('Failed to process the puzzle. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderSudokuGrid = (grid: number[][]) => {
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
                <span className="text-foreground">{cell}</span>
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
            Upload an image of a Sudoku puzzle and let AI solve it for you using advanced image recognition and backtracking algorithms.
          </p>
        </div>

        <div className="max-w-4xl mx-auto space-y-8">
          {/* Upload Area */}
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

          {/* Image Preview / Solution Display */}
          {(imagePreview || solvedGrid) && (
            <Card className="shadow-card">
              <CardContent className="p-8">
                <div className="grid md:grid-cols-2 gap-8 items-start">
                  {/* Image Preview */}
                  {imagePreview && !solvedGrid && (
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

                  {/* Solved Grid */}
                  {solvedGrid && (
                    <div className="space-y-4 md:col-span-2">
                      <div className="flex items-center gap-2 justify-center">
                        <CheckCircle className="w-6 h-6 text-green-500" />
                        <h3 className="text-lg font-semibold">Solved Puzzle</h3>
                      </div>
                      {renderSudokuGrid(solvedGrid)}
                    </div>
                  )}
                </div>

                {/* Solve Button */}
                {imagePreview && !solvedGrid && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="solve"
                      size="lg"
                      onClick={handleSolvePuzzle}
                      disabled={isProcessing}
                      className="min-w-48"
                    >
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-5 h-5 animate-spin mr-2" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Camera className="w-5 h-5 mr-2" />
                          Solve Puzzle
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {/* Reset Button */}
                {solvedGrid && (
                  <div className="flex justify-center mt-8">
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedImage(null);
                        setImagePreview(null);
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
