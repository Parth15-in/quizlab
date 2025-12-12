import { strict_output } from "@/lib/gpt";
import { getQuestionsSchema } from "@/schemas/forms/questions";
import { NextResponse } from "next/server";
import { ZodError } from "zod";

export const runtime = "nodejs";
export const maxDuration = 500;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { amount, topic, type } = getQuestionsSchema.parse(body);

    console.log("📩 Generating questions:", { amount, topic, type });

    let questions: any[] = [];

    const promptArr = new Array(amount).fill(
      type === "mcq"
        ? `Provide ONE MCQ question about ${topic}.
           You MUST return ONLY JSON with the fields:
           question, answer, option1, option2, option3.

           STRICT RULES:
           - All options MUST be unique and MEANINGFULLY different.
           - Incorrect options must NOT be similar to the correct answer.
           - Do NOT rephrase the correct answer as an option.
           - NO ambiguous options.
           - option1, option2, option3 MUST NOT match each other.
           - answer MUST NOT match any option.
           - NO duplicates or placeholder options.`

        : `Generate ONE medium-difficulty fill-in-the-blank question about ${topic}.

           🔒 STRICT RULES FOR BLANK FORMAT:
           - The question MUST contain EXACTLY ONE blank.
           - The blank MUST be written as: "______"
           - DO NOT create two blanks or variations like "____", "_________".
           - The blank MUST represent a key concept or important word.
           - The answer MUST be a short factual phrase (1–3 words).
           - NO descriptive or essay-type questions.
           - NO multiple blanks, no multi-part answers.

           MUST RETURN JSON ONLY:
           {
             "question": "A browser renders pages using ________.",
             "answer": "rendering engine"
           }

           GOOD EXAMPLES:
           - "CSS resets help remove ________ styling from browsers."
           - "In REST APIs, ________ identifies resources."
           - "JavaScript variables can be declared using ________."`
    );

    questions = await strict_output(
      "RETURN ONLY VALID JSON. NO MARKDOWN. NO EXTRA TEXT. NO PREFIX. NO EXPLANATIONS.",
      promptArr,
      type === "mcq"
        ? {
            question: "question",
            answer: "answer",
            option1: "option1",
            option2: "option2",
            option3: "option3",
          }
        : {
            question: "question",
            answer: "answer",
          }
    );

    console.log("✅ AI returned:", questions);

    if (!Array.isArray(questions) || questions.length === 0) {
      return NextResponse.json(
        { error: "AI failed to generate questions." },
        { status: 500 }
      );
    }

    return NextResponse.json({ questions }, { status: 200 });

  } catch (error) {
    console.error("❌ /api/questions ERROR:", error);

    if (error instanceof ZodError) {
      return NextResponse.json({ error: error.issues }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Server error generating questions" },
      { status: 500 }
    );
  }
}
