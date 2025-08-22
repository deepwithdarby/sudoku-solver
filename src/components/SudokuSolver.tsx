import React, { useState, useCallback } from 'react';
import { Upload, Camera, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Note: The SudokuGrid interface is no longer needed in the frontend since the
// new API endpoint returns the full solved grid, not just a recognized one.

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

  // This is the updated function that calls the new secure API route.
  const handleSolvePuzzle = async () => {
    if (!selectedImage || !imagePreview) {
      toast.error('Please select an image first');
      return;
    }

    setIsProcessing(true);
    try {
      toast.info('Sending image to server...');
      
      // Call the new secure API route instead of the Gemini API directly.
      const response = await fetch('/api/solve-sudoku', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ imageBase64: imagePreview }),
      });

      if (!response.ok) {
        throw new Error('Failed to process puzzle on the server.');
      }

      const data = await response.json();
      const solution = data.solvedGrid;
      
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

