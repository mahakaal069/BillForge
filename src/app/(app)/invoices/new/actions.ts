'use server';

import { suggestPaymentTerms } from '@/ai/flows/suggest-payment-terms.ts';
import type { SuggestPaymentTermsInput, SuggestPaymentTermsOutput } from '@/ai/flows/suggest-payment-terms.ts';

export async function suggestPaymentTermsAction(input: SuggestPaymentTermsInput): Promise<SuggestPaymentTermsOutput> {
  try {
    // Add validation or sanitization here if needed
    const result = await suggestPaymentTerms(input);
    return result;
  } catch (error) {
    console.error('Error in suggestPaymentTermsAction:', error);
    // It's good practice to throw a more generic error or a custom error
    // to avoid leaking sensitive details to the client.
    throw new Error('Failed to suggest payment terms due to a server error.');
  }
}
