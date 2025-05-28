'use server';

import { suggestPaymentTerms } from '@/ai/flows/suggest-payment-terms';
import type { SuggestPaymentTermsInput } from '@/ai/flows/suggest-payment-terms';

export async function suggestPaymentTermsAction(input: SuggestPaymentTermsInput) {
  try {
    const result = await suggestPaymentTerms(input);
    return result;
  } catch (error) {
    console.error('Error in suggestPaymentTermsAction:', error);

    // Return a user-friendly error object instead of throwing
    return {
      suggestedTerms: '',
      reasoning: '',
      error: 'Unable to generate payment terms suggestion at this time. Please try again later or set your terms manually.'
    };
  }
}
