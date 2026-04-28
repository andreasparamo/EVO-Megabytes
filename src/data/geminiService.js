import { GoogleGenAI } from "@google/genai";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_KEY; //gets the api key

let client = null;

function initializeGemini() {
  if (!GEMINI_API_KEY) {
    console.error("Gemini API unavailable for use!!!!!");
    return false;
  }
  if (!client) {
    client = new GoogleGenAI({
      apiKey: GEMINI_API_KEY,
    });
  }
  return true;
}

export async function generateCodeSnippets(language, difficulty = "medium") {
  if (!initializeGemini()) return null;

  const prompts = {
    c: `Generate a ${difficulty} difficulty C code snippet for a typing test. 
        Requirements:
        - Must be syntactically correct C code
        - Between 5-15 lines of code
        - Include common C patterns (loops, conditionals, functions, or pointers)
        - No comments or explanations, just pure code
        - Must be a complete, compilable snippet
        - Difficulty ${difficulty} means: easy=simple syntax, medium=moderate complexity, hard=advanced concepts
        
        Return ONLY the code, no markdown formatting, no explanations.`,

    cpp: `Generate a ${difficulty} difficulty C++ code snippet for a typing test.
        Requirements:
        - Must be syntactically correct C++ code
        - Between 5-15 lines of code
        - Use modern C++ features (STL, classes, templates for medium/hard)
        - No comments or explanations, just pure code
        - Must be a complete, compilable snippet
        - Difficulty ${difficulty} means: easy=simple syntax, medium=STL usage, hard=templates/smart pointers
        
        Return ONLY the code, no markdown formatting, no explanations.`,

    csharp: `Generate a ${difficulty} difficulty C# code snippet for a typing test.
        Requirements:
        - Must be syntactically correct C# code
        - Between 5-15 lines of code
        - Use common C# patterns (LINQ, properties, async for medium/hard)
        - No comments or explanations, just pure code
        - Must be a complete, compilable snippet
        - Difficulty ${difficulty} means: easy=simple syntax, medium=LINQ/properties, hard=async/generics

        Return ONLY the code, no markdown formatting, no explanations.`,

    python: `Generate a ${difficulty} difficulty Python code snippet for a typing test.
        Requirements:
        - Must be syntactically correct Python 3 code
        - Between 5-15 lines of code
        - No comments or explanations, just pure code
        - Difficulty ${difficulty} means: easy=basic loops/functions, medium=list comprehensions/classes, hard=decorators/generators/context managers

        Return ONLY the code, no markdown formatting, no explanations.`,

    java: `Generate a ${difficulty} difficulty Java code snippet for a typing test.
        Requirements:
        - Must be syntactically correct Java code
        - Between 5-15 lines of code
        - No comments or explanations, just pure code
        - Must be a complete, compilable class or method snippet
        - Difficulty ${difficulty} means: easy=basic OOP, medium=collections/interfaces, hard=generics/streams/lambdas

        Return ONLY the code, no markdown formatting, no explanations.`,

    javascript: `Generate a ${difficulty} difficulty JavaScript code snippet for a typing test.
        Requirements:
        - Must be syntactically correct modern JavaScript (ES6+)
        - Between 5-15 lines of code
        - No comments or explanations, just pure code
        - Difficulty ${difficulty} means: easy=basic functions/arrays, medium=promises/destructuring, hard=async-await/closures/prototype

        Return ONLY the code, no markdown formatting, no explanations.`,

    typescript: `Generate a ${difficulty} difficulty TypeScript code snippet for a typing test.
        Requirements:
        - Must be syntactically correct TypeScript code
        - Between 5-15 lines of code
        - No comments or explanations, just pure code
        - Difficulty ${difficulty} means: easy=basic types/interfaces, medium=generics/unions, hard=conditional types/mapped types/decorators

        Return ONLY the code, no markdown formatting, no explanations.`,

    go: `Generate a ${difficulty} difficulty Go code snippet for a typing test.
        Requirements:
        - Must be syntactically correct Go code
        - Between 5-15 lines of code
        - No comments or explanations, just pure code
        - Difficulty ${difficulty} means: easy=basic functions/loops, medium=structs/interfaces/goroutines, hard=channels/generics/error wrapping

        Return ONLY the code, no markdown formatting, no explanations.`,

    rust: `Generate a ${difficulty} difficulty Rust code snippet for a typing test.
        Requirements:
        - Must be syntactically correct Rust code
        - Between 5-15 lines of code
        - No comments or explanations, just pure code
        - Difficulty ${difficulty} means: easy=basic functions/ownership, medium=structs/traits/Result, hard=lifetimes/closures/iterators

        Return ONLY the code, no markdown formatting, no explanations.`,

    sql: `Generate a ${difficulty} difficulty SQL snippet for a typing test.
        Requirements:
        - Must be valid standard SQL
        - Between 3-10 lines
        - No comments or explanations, just pure SQL
        - Difficulty ${difficulty} means: easy=basic SELECT/INSERT/UPDATE, medium=JOINs/subqueries/GROUP BY, hard=CTEs/window functions/nested subqueries

        Return ONLY the SQL, no markdown formatting, no explanations.`,
  };

  const prompt = prompts[language] || prompts.c; //default is C

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      config: {
        temperature: 0.7,
        maxOutputTokens: 1024,
      },
    });

    const generatedText = result.text;

    if (!generatedText) {
      throw new Error("No Content Generated!!!!!!");
    }

    let code = generatedText.trim();
    code = code
      .replace(/```[a-z]*\n/g, "")
      .replace(/```$/g, "")
      .trim();

    return {
      id: `${language}-${Date.now()}`, //creates an ID
      code: code, //clean code
      difficulty,
      description: `Generated ${language.toUpperCase()} snippet`,
      generatedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error("Error generating snippet with Gemini: ", error);
    return null;
  }
}

export async function generateMultipleSnippets(
  language,
  difficulty,
  count = 5,
) {
  const snippets = [];
  for (let i = 0; i < count; i++) {
    const snippet = await generateCodeSnippets(language, difficulty);
    if (snippet) {
      snippets.push(snippet);
    }
    await new Promise((resolve) => setTimeout(resolve, 500)); //setting a timer to immitate users
  }
  return snippets;
}

// Test connection
export async function testGeminiConnection() {
  if (!initializeGemini()) {
    return { success: false, message: "API key not configured" };
  }

  try {
    const result = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: 'Say "Hello, Gemini is working!"' }] },
      ],
    });

    const text = result.text;

    return {
      success: true,
      message: "Gemini API connected successfully!",
      response: text,
    };
  } catch (error) {
    return {
      success: false,
      message: `Connection failed: ${error.message}`,
    };
  }
}
