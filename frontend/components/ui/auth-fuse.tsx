"use client";

import * as React from "react";
import { useState, useId, useEffect } from "react";
import { Slot } from "@radix-ui/react-slot";
import * as LabelPrimitive from "@radix-ui/react-label";
import { cva, type VariantProps } from "class-variance-authority";
import { Eye, EyeOff } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export interface TypewriterProps {
  text: string | string[];
  speed?: number;
  cursor?: string;
  loop?: boolean;
  deleteSpeed?: number;
  delay?: number;
  className?: string;
}

export function Typewriter({
  text,
  speed = 100,
  cursor = "|",
  loop = false,
  deleteSpeed = 50,
  delay = 1500,
  className,
}: TypewriterProps) {
  const [displayText, setDisplayText] = useState("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const [textArrayIndex, setTextArrayIndex] = useState(0);

  const textArray = Array.isArray(text) ? text : [text];
  const currentText = textArray[textArrayIndex] || "";

  useEffect(() => {
    if (!currentText) return;

    const timeout = setTimeout(
      () => {
        if (!isDeleting) {
          if (currentIndex < currentText.length) {
            setDisplayText((prev) => prev + currentText[currentIndex]);
            setCurrentIndex((prev) => prev + 1);
          } else if (loop) {
            setTimeout(() => setIsDeleting(true), delay);
          }
        } else {
          if (displayText.length > 0) {
            setDisplayText((prev) => prev.slice(0, -1));
          } else {
            setIsDeleting(false);
            setCurrentIndex(0);
            setTextArrayIndex((prev) => (prev + 1) % textArray.length);
          }
        }
      },
      isDeleting ? deleteSpeed : speed,
    );

    return () => clearTimeout(timeout);
  }, [
    currentIndex,
    isDeleting,
    currentText,
    loop,
    speed,
    deleteSpeed,
    delay,
    displayText,
    textArray,
  ]);

  return (
    <span className={className}>
      {displayText}
      <span className="animate-pulse">{cursor}</span>
    </span>
  );
}

const labelVariants = cva(
  "text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
);

const Label = React.forwardRef<
  React.ElementRef<typeof LabelPrimitive.Root>,
  React.ComponentPropsWithoutRef<typeof LabelPrimitive.Root> &
    VariantProps<typeof labelVariants>
>(({ className, ...props }, ref) => (
  <LabelPrimitive.Root
    ref={ref}
    className={cn(labelVariants(), className)}
    {...props}
  />
));
Label.displayName = LabelPrimitive.Root.displayName;

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input dark:border-input/50 bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary-foreground/60 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-12 rounded-md px-6",
        icon: "h-8 w-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  }
);
Button.displayName = "Button";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-10 w-full rounded-lg border border-input dark:border-input/50 bg-white dark:bg-zinc-900 px-3 py-3 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm shadow-black/5 transition-shadow placeholder:text-muted-foreground/70 focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = "Input";

export interface PasswordInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
}

const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  ({ className, label, ...props }, ref) => {
    const id = useId();
    const [showPassword, setShowPassword] = useState(false);
    const togglePasswordVisibility = () => setShowPassword((prev) => !prev);
    return (
      <div className="grid w-full items-center gap-2">
        {label && <Label htmlFor={id}>{label}</Label>}
        <div className="relative">
          <Input id={id} type={showPassword ? "text" : "password"} className={cn("pe-10", className)} ref={ref} {...props} />
          <button type="button" onClick={togglePasswordVisibility} className="absolute inset-y-0 end-0 flex h-full w-10 items-center justify-center text-muted-foreground/80 transition-colors hover:text-foreground focus-visible:text-foreground focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50" aria-label={showPassword ? "Hide password" : "Show password"}>
            {showPassword ? (<EyeOff className="size-4" aria-hidden="true" />) : (<Eye className="size-4" aria-hidden="true" />)}
          </button>
        </div>
      </div>
    );
  }
);
PasswordInput.displayName = "PasswordInput";

interface SignInFormProps {
  onSubmit: (data: { email: string; password: string }) => void;
  isLoading?: boolean;
}

function SignInForm({ onSubmit, isLoading }: SignInFormProps) {
  const [validationErrors, setValidationErrors] = useState<{email?: string; password?: string}>({});
  
  const handleSignIn = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    
    const formData = new FormData(event.currentTarget);
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    
    // Client-side validation
    const errors: {email?: string; password?: string} = {};
    
    if (!email || !email.includes('@')) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password || password.length < 6) {
      errors.password = 'Password must be at least 6 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    onSubmit({ email, password });
  };

  return (
    <form onSubmit={handleSignIn} autoComplete="on" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Sign in to your account</h1>
        <p className="text-balance text-sm text-muted-foreground">Enter your email below to sign in</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="m@example.com" 
            required 
            autoComplete="email"
            aria-label="Email address"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? "email-error" : undefined}
            className={validationErrors.email ? "border-red-500" : ""}
          />
          {validationErrors.email && (
            <p id="email-error" className="text-xs text-red-500" role="alert">
              {validationErrors.email}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <PasswordInput 
            name="password" 
            label="Password" 
            required 
            autoComplete="current-password" 
            placeholder="Password"
            aria-label="Password"
            aria-invalid={!!validationErrors.password}
            aria-describedby={validationErrors.password ? "password-error" : undefined}
            className={validationErrors.password ? "border-red-500" : ""}
          />
          {validationErrors.password && (
            <p id="password-error" className="text-xs text-red-500" role="alert">
              {validationErrors.password}
            </p>
          )}
        </div>
        <Button type="submit" variant="outline" className="mt-2" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? 'Signing in...' : 'Sign In'}
        </Button>
      </div>
    </form>
  );
}

interface SignUpFormProps {
  onSubmit: (data: { name: string; email: string; password: string; role?: string }) => void;
  isLoading?: boolean;
  showRole?: boolean;
}

function SignUpForm({ onSubmit, isLoading, showRole = false }: SignUpFormProps) {
  const [validationErrors, setValidationErrors] = useState<{name?: string; email?: string; password?: string}>({});
  
  const handleSignUp = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    
    // Clear previous errors
    setValidationErrors({});
    
    const formData = new FormData(event.currentTarget);
    const name = formData.get('name') as string;
    const email = formData.get('email') as string;
    const password = formData.get('password') as string;
    const role = formData.get('role') as string;
    
    // Client-side validation
    const errors: {name?: string; email?: string; password?: string} = {};
    
    if (!name || name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters';
    }
    
    if (!email || !email.includes('@')) {
      errors.email = 'Please enter a valid email address';
    }
    
    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters';
    }
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }
    
    onSubmit({ name, email, password, role });
  };

  return (
    <form onSubmit={handleSignUp} autoComplete="on" className="flex flex-col gap-8">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold">Create an account</h1>
        <p className="text-balance text-sm text-muted-foreground">Enter your details below to sign up</p>
      </div>
      <div className="grid gap-4">
        <div className="grid gap-1">
          <Label htmlFor="name">Full Name</Label>
          <Input 
            id="name" 
            name="name" 
            type="text" 
            placeholder="John Doe" 
            required 
            autoComplete="name"
            aria-label="Full name"
            aria-invalid={!!validationErrors.name}
            aria-describedby={validationErrors.name ? "name-error" : undefined}
            className={validationErrors.name ? "border-red-500" : ""}
          />
          {validationErrors.name && (
            <p id="name-error" className="text-xs text-red-500" role="alert">
              {validationErrors.name}
            </p>
          )}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input 
            id="email" 
            name="email" 
            type="email" 
            placeholder="m@example.com" 
            required 
            autoComplete="email"
            aria-label="Email address"
            aria-invalid={!!validationErrors.email}
            aria-describedby={validationErrors.email ? "email-error" : undefined}
            className={validationErrors.email ? "border-red-500" : ""}
          />
          {validationErrors.email && (
            <p id="email-error" className="text-xs text-red-500" role="alert">
              {validationErrors.email}
            </p>
          )}
        </div>
        {showRole && (
          <div className="grid gap-2">
            <Label htmlFor="role">Account Type</Label>
            <select
              id="role"
              name="role"
              aria-label="Account type"
              className="flex h-10 w-full rounded-lg border border-input dark:border-input/50 bg-white dark:bg-zinc-900 px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm shadow-black/5 transition-shadow focus-visible:bg-white dark:focus-visible:bg-zinc-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-950 dark:focus-visible:ring-zinc-300 disabled:cursor-not-allowed disabled:opacity-50"
              defaultValue="USER"
            >
              <option value="USER" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">User</option>
              <option value="MODEL_PROVIDER" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Model Provider</option>
              <option value="VERIFIER" className="bg-white dark:bg-zinc-900 text-zinc-900 dark:text-zinc-100">Verifier</option>
            </select>
          </div>
        )}
        <div className="grid gap-2">
          <PasswordInput 
            name="password" 
            label="Password" 
            required 
            autoComplete="new-password" 
            placeholder="Password"
            aria-label="Password (minimum 8 characters)"
            aria-invalid={!!validationErrors.password}
            aria-describedby={validationErrors.password ? "password-error" : undefined}
            className={validationErrors.password ? "border-red-500" : ""}
          />
          {validationErrors.password && (
            <p id="password-error" className="text-xs text-red-500" role="alert">
              {validationErrors.password}
            </p>
          )}
        </div>
        <Button type="submit" variant="outline" className="mt-2" disabled={isLoading} aria-busy={isLoading}>
          {isLoading ? 'Creating account...' : 'Sign Up'}
        </Button>
      </div>
    </form>
  );
}

interface AuthFormContainerProps {
  isSignIn: boolean;
  onToggle: () => void;
  onSignIn: (data: { email: string; password: string }) => void;
  onSignUp: (data: { name: string; email: string; password: string; role?: string }) => void;
  isLoading?: boolean;
  showRole?: boolean;
  showGoogleAuth?: boolean;
}

function AuthFormContainer({ isSignIn, onToggle, onSignIn, onSignUp, isLoading, showRole, showGoogleAuth = true }: AuthFormContainerProps) {
    return (
        <div className="mx-auto grid w-[350px] gap-2">
            {isSignIn ? (
              <SignInForm onSubmit={onSignIn} isLoading={isLoading} />
            ) : (
              <SignUpForm onSubmit={onSignUp} isLoading={isLoading} showRole={showRole} />
            )}
            <div className="text-center text-sm">
                {isSignIn ? "Don't have an account?" : "Already have an account?"}{" "}
                <Button variant="link" className="pl-1 text-foreground" onClick={onToggle}>
                    {isSignIn ? "Sign up" : "Sign in"}
                </Button>
            </div>
            {showGoogleAuth && (
              <>
                <div className="relative text-center text-sm after:absolute after:inset-0 after:top-1/2 after:z-0 after:flex after:items-center after:border-t after:border-border">
                    <span className="relative z-10 bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
                <Button variant="outline" type="button" onClick={() => console.log("UI: Google button clicked")}>
                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google icon" className="mr-2 h-4 w-4" />
                    Continue with Google
                </Button>
              </>
            )}
        </div>
    )
}

interface AuthContentProps {
    image?: {
        src: string;
        alt: string;
    };
    quote?: {
        text: string;
        author: string;
    }
}

export interface AuthUIProps {
    signInContent?: AuthContentProps;
    signUpContent?: AuthContentProps;
    onSignIn?: (data: { email: string; password: string }) => void;
    onSignUp?: (data: { name: string; email: string; password: string; role?: string }) => void;
    isLoading?: boolean;
    showRole?: boolean;
    showGoogleAuth?: boolean;
}

const defaultSignInContent = {
    image: {
        src: "https://i.ibb.co/XrkdGrrv/original-ccdd6d6195fff2386a31b684b7abdd2e-removebg-preview.png",
        alt: "Secure AI verification visualization"
    },
    quote: {
        text: "Trustless AI verification with zero-knowledge proofs.",
        author: "VeraNode Platform"
    }
};

const defaultSignUpContent = {
    image: {
        src: "https://i.ibb.co/HTZ6DPsS/original-33b8479c324a5448d6145b3cad7c51e7-removebg-preview.png",
        alt: "Neural network visualization for AI models"
    },
    quote: {
        text: "Join the decentralized AI verification revolution.",
        author: "VeraNode Platform"
    }
};

export function AuthUI({ 
  signInContent = {}, 
  signUpContent = {},
  onSignIn = () => {},
  onSignUp = () => {},
  isLoading = false,
  showRole = true,
  showGoogleAuth = false,
}: AuthUIProps) {
  const [isSignIn, setIsSignIn] = useState(true);
  const toggleForm = () => setIsSignIn((prev) => !prev);

  const finalSignInContent = {
      image: { ...defaultSignInContent.image, ...signInContent.image },
      quote: { ...defaultSignInContent.quote, ...signInContent.quote },
  };
  const finalSignUpContent = {
      image: { ...defaultSignUpContent.image, ...signUpContent.image },
      quote: { ...defaultSignUpContent.quote, ...signUpContent.quote },
  };

  const currentContent = isSignIn ? finalSignInContent : finalSignUpContent;

  return (
    <div className="w-full min-h-screen md:grid md:grid-cols-2">
      <style>{`
        input[type="password"]::-ms-reveal,
        input[type="password"]::-ms-clear {
          display: none;
        }
      `}</style>
      <div className="flex h-screen items-center justify-center p-6 md:h-auto md:p-0 md:py-12">
        <AuthFormContainer 
          isSignIn={isSignIn} 
          onToggle={toggleForm}
          onSignIn={onSignIn}
          onSignUp={onSignUp}
          isLoading={isLoading}
          showRole={showRole}
          showGoogleAuth={showGoogleAuth}
        />
      </div>

      <div
        className="hidden md:block relative bg-cover bg-center transition-all duration-500 ease-in-out"
        style={{ backgroundImage: `url(${currentContent.image.src})` }}
        key={currentContent.image.src}
      >
        <div className="absolute inset-x-0 bottom-0 h-[100px] bg-gradient-to-t from-background to-transparent" />
        
        <div className="relative z-10 flex h-full flex-col items-center justify-end p-2 pb-6">
            <blockquote className="space-y-2 text-center text-foreground">
              <p className="text-lg font-medium">
                "<Typewriter
                    key={currentContent.quote.text}
                    text={currentContent.quote.text}
                    speed={60}
                  />"
              </p>
              <cite className="block text-sm font-light text-muted-foreground not-italic">
                  — {currentContent.quote.author}
              </cite>
            </blockquote>
        </div>
      </div>
    </div>
  );
}
