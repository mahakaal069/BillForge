"use client";

import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  delay?: number;
  header?: {
    title: string;
    icon?: React.ReactNode;
    className?: string;
  };
}

export function AnimatedCard({
  children,
  className,
  delay = 0,
  header,
}: AnimatedCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.5,
        delay: delay * 0.1,
        ease: [0.4, 0, 0.2, 1],
      }}
      className={cn("h-full", className)}
    >
      <Card className="h-full overflow-hidden backdrop-blur-sm bg-card/95 border-muted/20">
        {header && (
          <CardHeader className="p-4">
            <CardTitle
              className={cn(
                "flex items-center gap-2 text-sm font-medium",
                header.className
              )}
            >
              {header.icon}
              {header.title}
            </CardTitle>
          </CardHeader>
        )}
        <CardContent className={cn("p-4 pt-0", { "pt-4": !header })}>
          {children}
        </CardContent>
      </Card>
    </motion.div>
  );
}
