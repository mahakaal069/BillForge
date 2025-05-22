// 'use server';
/**
 * @fileOverview This file defines a Genkit flow for suggesting optimal payment terms for invoices.
 *
 * The flow takes into account factors like invoice amount, client history, and industry standards
 * to provide intelligent payment term suggestions.
 *
 * @exports {
 *   suggestPaymentTerms: (input: SuggestPaymentTermsInput) => Promise<SuggestPaymentTermsOutput>;
 *   SuggestPaymentTermsInput: z.infer<typeof SuggestPaymentTermsInputSchema>;
 *   SuggestPaymentTermsOutput: z.infer<typeof SuggestPaymentTermsOutputSchema>;
 * }
 */

'use server';

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

/**
 * Input schema for the suggestPaymentTerms flow.
 */
const SuggestPaymentTermsInputSchema = z.object({
  invoiceAmount: z
    .number()
    .describe('The total amount of the invoice.'),
  clientHistory: z
    .string()
    .describe('A summary of the client historical payment behavior.'),
  industryStandards: z
    .string()
    .describe('The industry standards for payment terms.'),
});

export type SuggestPaymentTermsInput = z.infer<typeof SuggestPaymentTermsInputSchema>;

/**
 * Output schema for the suggestPaymentTerms flow.
 */
const SuggestPaymentTermsOutputSchema = z.object({
  suggestedTerms: z
    .string()
    .describe('The suggested payment terms for the invoice.'),
  reasoning: z
    .string()
    .describe('The reasoning behind the suggested payment terms.'),
});

export type SuggestPaymentTermsOutput = z.infer<typeof SuggestPaymentTermsOutputSchema>;

/**
 * Wrapper function to call the suggestPaymentTermsFlow.
 *
 * @param {SuggestPaymentTermsInput} input - The input to the flow.
 * @returns {Promise<SuggestPaymentTermsOutput>} The output of the flow.
 */
export async function suggestPaymentTerms(input: SuggestPaymentTermsInput): Promise<SuggestPaymentTermsOutput> {
  return suggestPaymentTermsFlow(input);
}

/**
 * Prompt definition for suggesting payment terms.
 */
const suggestPaymentTermsPrompt = ai.definePrompt({
  name: 'suggestPaymentTermsPrompt',
  input: {schema: SuggestPaymentTermsInputSchema},
  output: {schema: SuggestPaymentTermsOutputSchema},
  prompt: `Given the following invoice details, client history, and industry standards, suggest optimal payment terms for the invoice.

Invoice Amount: {{{invoiceAmount}}}
Client History: {{{clientHistory}}}
Industry Standards: {{{industryStandards}}}

Consider all these factors, and reason step by step before providing the suggested payment terms and a brief explanation of your reasoning.`,
});

/**
 * Genkit flow for suggesting payment terms.
 */
const suggestPaymentTermsFlow = ai.defineFlow(
  {
    name: 'suggestPaymentTermsFlow',
    inputSchema: SuggestPaymentTermsInputSchema,
    outputSchema: SuggestPaymentTermsOutputSchema,
  },
  async input => {
    const {output} = await suggestPaymentTermsPrompt(input);
    return output!;
  }
);
