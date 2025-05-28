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

import { ai } from '@/ai/genkit';
import { z } from 'genkit';

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
 * Flow for suggesting payment terms using AI.
 * @param input The input parameters for the suggestion.
 * @returns The suggested payment terms and reasoning.
 */
export async function suggestPaymentTerms(input: SuggestPaymentTermsInput): Promise<SuggestPaymentTermsOutput> {
  const response = await ai.chat.completions.create({
    messages: [
      {
        role: 'system',
        content: 'You are an AI assistant that helps determine optimal payment terms for invoices.'
      },
      {
        role: 'user',
        content: `Given the following invoice details, client history, and industry standards, suggest optimal payment terms for the invoice.

Invoice Amount: ${input.invoiceAmount}
Client History: ${input.clientHistory}
Industry Standards: ${input.industryStandards}

Consider all these factors, and reason step by step. Format your response as:
Terms: [suggested payment terms]
Reasoning: [detailed explanation]`
      }
    ],
    temperature: 0.7,
    maxTokens: 500
  });

  const content = response.choices[0]?.message?.content || '';
  const termsMatch = content.match(/Terms:\s*(.*?)(?=\nReasoning:|$)/s);
  const reasoningMatch = content.match(/Reasoning:\s*(.*?)$/s);

  if (!termsMatch || !reasoningMatch) {
    throw new Error('Failed to parse AI response into the expected format');
  }

  return {
    suggestedTerms: termsMatch[1].trim(),
    reasoning: reasoningMatch[1].trim()
  };
}
