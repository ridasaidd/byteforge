import { createContext, useContext, useReducer, useCallback, ReactNode } from 'react';

// ============================================================================
// Types
// ============================================================================

// Form value type - can be string, number, boolean, or array for multi-select
export type FormFieldValue = string | number | boolean | string[] | null | undefined;

export interface FormState {
  values: Record<string, FormFieldValue>;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
  isSubmitting: boolean;
  isSubmitted: boolean;
  submitError: string | null;
}

export interface FormContextValue extends FormState {
  setValue: (name: string, value: FormFieldValue) => void;
  setTouched: (name: string) => void;
  setError: (name: string, error: string) => void;
  clearError: (name: string) => void;
  reset: () => void;
  submit: () => Promise<void>;
}

type FormAction =
  | { type: 'SET_VALUE'; name: string; value: FormFieldValue }
  | { type: 'SET_TOUCHED'; name: string }
  | { type: 'SET_ERROR'; name: string; error: string }
  | { type: 'CLEAR_ERROR'; name: string }
  | { type: 'SUBMIT_START' }
  | { type: 'SUBMIT_SUCCESS' }
  | { type: 'SUBMIT_ERROR'; error: string }
  | { type: 'RESET' };

// ============================================================================
// Reducer
// ============================================================================

const initialState: FormState = {
  values: {},
  errors: {},
  touched: {},
  isSubmitting: false,
  isSubmitted: false,
  submitError: null,
};

function formReducer(state: FormState, action: FormAction): FormState {
  switch (action.type) {
    case 'SET_VALUE':
      return {
        ...state,
        values: { ...state.values, [action.name]: action.value },
        // Clear error when value changes
        errors: { ...state.errors, [action.name]: '' },
      };
    case 'SET_TOUCHED':
      return {
        ...state,
        touched: { ...state.touched, [action.name]: true },
      };
    case 'SET_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.name]: action.error },
      };
    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: { ...state.errors, [action.name]: '' },
      };
    case 'SUBMIT_START':
      return {
        ...state,
        isSubmitting: true,
        submitError: null,
      };
    case 'SUBMIT_SUCCESS':
      return {
        ...state,
        isSubmitting: false,
        isSubmitted: true,
      };
    case 'SUBMIT_ERROR':
      return {
        ...state,
        isSubmitting: false,
        submitError: action.error,
      };
    case 'RESET':
      return initialState;
    default:
      return state;
  }
}

// ============================================================================
// Context
// ============================================================================

const FormContext = createContext<FormContextValue | null>(null);

// ============================================================================
// Hook
// ============================================================================

export function useFormContext(): FormContextValue | null {
  return useContext(FormContext);
}

/**
 * Hook for individual form fields
 * Returns field-specific state and handlers
 */
export function useFormField(name: string) {
  const ctx = useFormContext();
  
  // Return null-safe defaults if not inside a Form
  if (!ctx) {
    return {
      value: '',
      error: undefined,
      touched: false,
      onChange: () => {},
      onBlur: () => {},
      isInsideForm: false,
    };
  }
  
  return {
    value: ctx.values[name] ?? '',
    error: ctx.touched[name] ? ctx.errors[name] : undefined,
    touched: ctx.touched[name] ?? false,
    onChange: (value: FormFieldValue) => ctx.setValue(name, value),
    onBlur: () => ctx.setTouched(name),
    isInsideForm: true,
  };
}

// ============================================================================
// Provider
// ============================================================================

interface FormProviderProps {
  children: ReactNode;
  onSubmit: (values: Record<string, FormFieldValue>) => Promise<void>;
  initialValues?: Record<string, FormFieldValue>;
}

export function FormProvider({ children, onSubmit, initialValues = {} }: FormProviderProps) {
  const [state, dispatch] = useReducer(formReducer, {
    ...initialState,
    values: initialValues,
  });

  const setValue = useCallback((name: string, value: FormFieldValue) => {
    dispatch({ type: 'SET_VALUE', name, value });
  }, []);

  const setTouched = useCallback((name: string) => {
    dispatch({ type: 'SET_TOUCHED', name });
  }, []);

  const setError = useCallback((name: string, error: string) => {
    dispatch({ type: 'SET_ERROR', name, error });
  }, []);

  const clearError = useCallback((name: string) => {
    dispatch({ type: 'CLEAR_ERROR', name });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: 'RESET' });
  }, []);

  const submit = useCallback(async () => {
    dispatch({ type: 'SUBMIT_START' });
    try {
      await onSubmit(state.values);
      dispatch({ type: 'SUBMIT_SUCCESS' });
    } catch (error) {
      dispatch({ 
        type: 'SUBMIT_ERROR', 
        error: error instanceof Error ? error.message : 'An error occurred' 
      });
      throw error;
    }
  }, [onSubmit, state.values]);

  const contextValue: FormContextValue = {
    ...state,
    setValue,
    setTouched,
    setError,
    clearError,
    reset,
    submit,
  };

  return (
    <FormContext.Provider value={contextValue}>
      {children}
    </FormContext.Provider>
  );
}

export default FormContext;
