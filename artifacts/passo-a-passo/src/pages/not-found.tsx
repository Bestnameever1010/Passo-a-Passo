import { Card, CardContent } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background text-foreground p-5">
      <Card className="w-full max-w-md mx-4 border-border bg-card text-card-foreground">
        <CardContent className="pt-6">
          <div className="flex mb-4 gap-2">
            <AlertCircle className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold text-card-foreground">
              Página não encontrada
            </h1>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            O endereço solicitado não corresponde a uma página do Passo a Passo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
