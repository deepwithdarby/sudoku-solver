import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Clock } from 'lucide-react';
import { toast } from 'sonner';

const Welcome = () => {
  const [timeLeft, setTimeLeft] = useState(30);
  const [isEnabled, setIsEnabled] = useState(() => {
    return localStorage.getItem('sudoku-rules-read') === 'true';
  });
  const navigate = useNavigate();

  useEffect(() => {
    // Skip timer if user has already read rules
    if (localStorage.getItem('sudoku-rules-read') === 'true') {
      return;
    }
    
    if (timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setIsEnabled(true);
    }
  }, [timeLeft]);

  const handleGetStarted = () => {
    if (!isEnabled) {
      toast.error(`Read the rules properly before uploading the image. Your main page should open in ${timeLeft} seconds`);
      return;
    }
    localStorage.setItem('sudoku-rules-read', 'true');
    navigate('/solver');
  };

  const rules = [
    {
      title: "Clear & Straight Angle",
      description: "Take the picture from directly above the Sudoku (not tilted). Avoid skewed or rotated images."
    },
    {
      title: "Good Lighting", 
      description: "Make sure the Sudoku is well-lit, no strong shadows or glares. Natural daylight or evenly lit room works best."
    },
    {
      title: "High Resolution",
      description: "Use a clear, sharp photo (avoid blurry images). The numbers should be easily readable."
    },
    {
      title: "Full Grid Visible",
      description: "Capture the entire 9×9 Sudoku grid in the frame. Crop the required puzzle (important) but do not crop out any edges of the puzzle."
    },
    {
      title: "Plain Background",
      description: "Place the Sudoku on a flat surface with minimal distractions. Avoid patterned or noisy backgrounds."
    },
    {
      title: "Dark & Neat Digits",
      description: "Printed numbers work best, but neat handwritten numbers are acceptable if clearly visible. Avoid very faint or messy handwriting."
    },
    {
      title: "Avoid Extra Marks",
      description: "Don't upload puzzles with scribbles, notes, or multiple numbers written in the same cell."
    },
    {
      title: "File Type & Size",
      description: "Supported formats: JPG / PNG."
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-4">
            AI Sudoku Solver
          </h1>
          <p className="text-lg text-muted-foreground">
            Upload your Sudoku puzzle image and let AI solve it instantly
          </p>
        </div>

        <div className="text-center mb-8">
          <Button
            onClick={handleGetStarted}
            disabled={!isEnabled}
            size="lg"
            className="min-w-48 h-12 text-lg font-semibold"
            variant={isEnabled ? "default" : "secondary"}
          >
            {isEnabled ? (
              "Get Started"
            ) : (
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Get Started ({timeLeft}s)
              </div>
            )}
          </Button>
          
          {!isEnabled && (
            <p className="text-sm text-muted-foreground mt-4">
              Please read the rules carefully. The button will be enabled in {timeLeft} seconds.
            </p>
          )}
        </div>

        <Card className="border-primary/20 shadow-elegant">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary flex items-center justify-center gap-2">
              <CheckCircle className="h-6 w-6" />
              Best Practices for Uploading Sudoku Images
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {rules.map((rule, index) => (
              <div key={index} className="flex gap-4 p-4 rounded-lg bg-card/50 border border-border/50">
                <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 text-primary font-bold flex items-center justify-center text-sm">
                  {index + 1}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{rule.title}</h3>
                  <p className="text-muted-foreground text-sm leading-relaxed">{rule.description}</p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Welcome;