import type { NextApiRequest, NextApiResponse } from 'next';

// This is the Sudoku solving function, moved to the backend.
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

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Ensure we are only handling POST requests.
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  // Get the API key from the environment variables.
  const API_KEY = process.env.GEMINI_API_KEY;
  if (!API_KEY) {
    console.error('API key is not set in environment variables.');
    return res.status(500).json({ message: 'Server configuration error' });
  }

  const { imageBase64 } = req.body;
  if (!imageBase64) {
    return res.status(400).json({ message: 'Image data is required' });
  }

  try {
    // 1. Recognize the Sudoku grid using the secure API key.
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent?key=${API_KEY}`, {
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
    
    // Clean and parse the JSON response
    let cleanedText = text.trim();
    if (cleanedText.startsWith('```json')) {
      cleanedText = cleanedText.replace(/```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleanedText.startsWith('```')) {
      cleanedText = cleanedText.replace(/```\s*/, '').replace(/\s*```$/, '');
    }
    
    const recognizedGrid = JSON.parse(cleanedText);

    if (!Array.isArray(recognizedGrid) || recognizedGrid.length !== 9 || !recognizedGrid.every(row => Array.isArray(row) && row.length === 9)) {
      throw new Error('Invalid grid format from AI response');
    }
    
    // 2. Solve the Sudoku puzzle.
    const solvedGrid = solveSudoku(recognizedGrid);

    // 3. Return the solved grid to the frontend.
    res.status(200).json({ solvedGrid });

  } catch (error) {
    console.error('Error in API route:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

