/* eslint-disable react/prop-types */
import React from 'react';
import { CheckCircle2, Circle, Clock, XCircle, AlertCircle, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const STATUS_FLOW = [
  { id: 'Pending Approval', label: 'Pending', description: 'Verifying report' },
  { id: 'Assigned', label: 'Assigned', description: 'Technician assigned' },
  { id: 'In Progress', label: 'In Progress', description: 'Work in progress' },
  { id: 'Resolved', label: 'Resolved', description: 'Issue fixed' }
];

const ReportStatus = ({ currentStatus }) => {
  const isRejected = currentStatus === 'Rejected';
  const isSuspended = currentStatus === 'Suspended';
  
  const activeStep = STATUS_FLOW.find(step => step.id === currentStatus) || STATUS_FLOW[0];
  const activeIndex = STATUS_FLOW.findIndex(step => step.id === currentStatus);
  const progressIndex = currentStatus === 'Resolved' ? STATUS_FLOW.length : activeIndex;

  // --- STATI SPECIALI (Rejected/Suspended) ---
  if (isRejected) {
    return (
      <div className="w-full bg-destructive/10 border border-destructive/20 p-3 rounded-md flex items-center gap-3 text-destructive my-2">
        <XCircle className="h-5 w-5 shrink-0" />
        <span className="font-medium text-sm">Rejected</span>
      </div>
    );
  }

  if (isSuspended) {
    return (
      <div className="w-full bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 p-3 rounded-md flex items-center gap-3 text-yellow-700 dark:text-yellow-400 my-2">
        <AlertCircle className="h-5 w-5 shrink-0" />
        <span className="font-medium text-sm">Suspended</span>
      </div>
    );
  }

  return (
    <div className="w-full my-3">
      
      {/* --- MOBILE VIEW (Solo Status Corrente) --- */}
      <div className="md:hidden">
        <div className={cn(
          "flex items-center gap-3 p-3 rounded-lg border shadow-sm transition-colors",
          currentStatus === 'Resolved' 
            ? "bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800" 
            : "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800"
        )}>
          {/* Icona Grande */}
          <div className={cn(
            "h-10 w-10 flex items-center justify-center rounded-full border-2 shrink-0",
            currentStatus === 'Resolved'
              ? "bg-green-500 border-green-600 text-white"
              : "bg-card border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400"
          )}>
             {currentStatus === 'Resolved' ? (
               <CheckCircle2 className="h-6 w-6" />
             ) : (
               <Activity className="h-6 w-6 animate-pulse" />
             )}
          </div>
          
          {/* Testo Status */}
          <div>
            <p className={cn(
              "text-xs uppercase font-bold tracking-wider mb-0.5",
              currentStatus === 'Resolved' 
                ? "text-green-700 dark:text-green-400" 
                : "text-blue-700 dark:text-blue-400"
            )}>
              Current Status
            </p>
            <div className="flex items-baseline gap-2">
              <span className="font-bold text-foreground text-sm">{activeStep.label}</span>
              <span className="text-xs text-muted-foreground font-medium">– {activeStep.description}</span>
            </div>
          </div>
        </div>
      </div>

      {/* --- DESKTOP VIEW (Timeline Completa) --- */}
      <div className="hidden md:flex relative flex-row justify-between items-center w-full">
        
        {/* Linea di connessione */}
        <div className="absolute top-1/2 left-0 w-full h-0.5 bg-border -z-10 -translate-y-1/2" />

        {STATUS_FLOW.map((step, index) => {
          const isCompleted = index < progressIndex || currentStatus === 'Resolved';
          const isActive = step.id === currentStatus;

          return (
            <div key={step.id} className="flex flex-col items-center gap-2 relative bg-card px-2 z-10">
              {/* Icona */}
              <div 
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full border-2 transition-all duration-300 shrink-0",
                  isCompleted 
                    ? "border-green-500 bg-green-500 text-white" 
                    : isActive 
                      ? "border-blue-600 bg-card text-blue-600 dark:text-blue-400 ring-4 ring-blue-50 dark:ring-blue-900/30" 
                      : "border-muted bg-card text-muted-foreground"
                )}
              >
                {isCompleted ? <CheckCircle2 className="h-5 w-5" /> : 
                 isActive ? <Clock className="h-5 w-5 animate-pulse" /> : 
                 <Circle className="h-5 w-5" />}
              </div>

              {/* Testo */}
              <div className="flex flex-col items-center text-center">
                <span className={cn(
                  "text-xs font-bold uppercase tracking-wide",
                  isActive 
                    ? "text-blue-700 dark:text-blue-400" 
                    : isCompleted 
                      ? "text-green-700 dark:text-green-400" 
                      : "text-muted-foreground"
                )}>
                  {step.label}
                </span>
                <span className="text-[10px] text-muted-foreground max-w-[80px] leading-tight">
                  {step.description}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ReportStatus;