"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { Zap, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export interface ActionItem {
  icon: React.ReactNode;
  label: string;
  description?: string;
  onClick: () => void;
}

interface QuickLinksCardProps {
  title?: string;
  subtitle?: string;
  actions: ActionItem[];
  className?: string;
}

export const QuickLinksCard = React.forwardRef<HTMLDivElement, QuickLinksCardProps>(
  ({ title = "Quick Actions", subtitle, actions, className }, ref) => {
    const containerVariants = {
      hidden: { opacity: 0, y: 20 },
      visible: {
        opacity: 1,
        y: 0,
        transition: {
          staggerChildren: 0.1,
        },
      },
    };

    const itemVariants = {
      hidden: { opacity: 0, y: 15 },
      visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
    };

    const hoverTransition = { type: "spring", stiffness: 300, damping: 15 };

    return (
      <motion.div
        ref={ref}
        className={cn("w-full p-6 bg-card text-card-foreground rounded-2xl border", className)}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <Zap className="w-5 h-5 text-primary" />
        </motion.div>

        {/* Action Cards Grid */}
        <div className="grid grid-cols-1 gap-4">
          {actions.map((action, index) => (
            <motion.div
              key={index}
              variants={itemVariants}
              whileHover={{ scale: 1.03, y: -5 }}
              transition={hoverTransition}
            >
              <Card 
                className="h-full p-4 overflow-hidden rounded-xl cursor-pointer group hover:shadow-lg transition-shadow"
                onClick={action.onClick}
              >
                <CardContent className="p-2">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 dark:bg-primary/20 flex items-center justify-center text-primary shrink-0 group-hover:bg-primary/20 dark:group-hover:bg-primary/30 transition-colors">
                      <div className="h-6 w-6">
                        {action.icon}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {action.label}
                      </p>
                      {action.description && (
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {action.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="w-5 h-5 text-muted-foreground group-hover:text-primary group-hover:translate-x-1 transition-all shrink-0" />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA Banner */}
        <motion.div
          variants={itemVariants}
          whileHover={{ scale: 1.02 }}
          transition={hoverTransition}
          className="mt-4"
        >
          <div className="flex items-center justify-between p-4 rounded-xl bg-muted/60">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-full bg-background">
                <Zap className="w-4 h-4 text-foreground" />
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                Need help getting started?
              </p>
            </div>
            <Button variant="ghost" size="sm" className="shrink-0">
              View Guide
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </motion.div>
      </motion.div>
    );
  }
);

QuickLinksCard.displayName = "QuickLinksCard";
