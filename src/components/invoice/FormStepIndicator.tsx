"use client";

import { motion } from "framer-motion";
import { IconCircleCheck, IconCircleDot } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

interface FormStepIndicatorProps {
  steps: string[];
  currentStep: number;
  className?: string;
}

export function FormStepIndicator({
  steps,
  currentStep,
  className,
}: FormStepIndicatorProps) {
  return (
    <div
      className={cn("flex items-center justify-center w-full gap-4", className)}
    >
      {steps.map((step, index) => {
        const isCompleted = currentStep > index;
        const isCurrent = currentStep === index;

        return (
          <div key={step} className="flex items-center">
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={{
                  backgroundColor:
                    isCompleted || isCurrent
                      ? "hsl(var(--primary))"
                      : "transparent",
                  borderColor:
                    isCompleted || isCurrent
                      ? "hsl(var(--primary))"
                      : "hsl(var(--muted))",
                  scale: isCurrent ? 1.1 : 1,
                }}
                className={cn(
                  "w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm",
                  isCompleted || isCurrent
                    ? "text-primary-foreground"
                    : "text-muted-foreground"
                )}
                transition={{ duration: 0.2 }}
              >
                {isCompleted ? (
                  <IconCircleCheck className="w-5 h-5" />
                ) : isCurrent ? (
                  <IconCircleDot className="w-5 h-5" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </motion.div>
              <motion.span
                initial={false}
                animate={{
                  color: isCurrent
                    ? "hsl(var(--foreground))"
                    : "hsl(var(--muted-foreground))",
                }}
                className="mt-2 text-sm font-medium"
              >
                {step}
              </motion.span>
            </div>
            {index < steps.length - 1 && (
              <motion.div
                initial={false}
                animate={{
                  backgroundColor: isCompleted
                    ? "hsl(var(--primary))"
                    : "hsl(var(--muted))",
                }}
                className="h-0.5 w-16 mx-2"
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
