import { GoogleGenAI } from "@google/genai";
import { SYSTEM_PROMPT } from "../constants";
import { CareerAnalysis, UserInput, InterviewPrepData } from "../types";

export const parseProfileMetadata = async (text: string): Promise<Partial<UserInput>> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Analyze the following resume/profile text and extract key details into a JSON object.
      
      Output JSON Schema:
      {
        "city": "string (inferred current location, e.g. 'Bengaluru', or empty if unknown)",
        "experienceLevel": "string (one of: 'student', 'fresher', '1-3_years', '3-5_years', '5_plus_years', 'career-switcher')",
        "yearsExperience": "string (numeric string e.g. '4', or empty)",
        "focusArea": "string (main role/industry e.g. 'Frontend Dev', 'Marketing')"
      }

      Rules:
      - 'student': Still in college or looking for internship.
      - 'fresher': Graduated, 0-1 years exp.
      - '1-3_years': 1 to 3 years.
      - '3-5_years': 3 to 5 years.
      - '5_plus_years': 5+ years.
      
      Text to Analyze:
      ${text.substring(0, 5000)}
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: {
        responseMimeType: "application/json",
      },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    const jsonText = response.text || "{}";
    const data = JSON.parse(jsonText);
    
    // Validate experienceLevel matches known values, else default to fresher
    const validLevels = ['student', 'fresher', '1-3_years', '3-5_years', '5_plus_years', 'career-switcher'];
    if (!validLevels.includes(data.experienceLevel)) {
      data.experienceLevel = 'fresher';
    }

    return {
      city: data.city || "",
      experienceLevel: data.experienceLevel,
      yearsExperience: data.yearsExperience || "",
      mode: 'fast' // default, not extracted
    };
  } catch (e) {
    console.error("Failed to extract metadata", e);
    return {};
  }
};

export const generateInterviewPrep = async (role: string, resumeText: string): Promise<InterviewPrepData> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      You are an expert technical interviewer for the Indian job market.
      
      Role: ${role}
      Candidate Resume Snippet: ${resumeText.substring(0, 3000)}...

      Task: Generate 3 likely interview questions and identify 3 missing keywords for this candidate.
      
      Output JSON format:
      {
        "questions": [
          { 
            "question": "The question text", 
            "type": "Technical" or "Behavioral",
            "tip": "A short, specific tip on how THIS candidate should answer based on their resume (e.g. 'Mention your React project here')"
          }
        ],
        "missing_keywords": ["keyword1", "keyword2", "keyword3"]
      }

      Requirements:
      - 2 Technical questions, 1 Behavioral/HR question.
      - Keep it realistic for the role.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      config: { responseMimeType: "application/json" },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return JSON.parse(response.text || "{}") as InterviewPrepData;
  } catch (error) {
    console.error("Interview Prep Error", error);
    throw new Error("Could not generate interview questions.");
  }
};

export const generateCoverLetter = async (role: string, resumeText: string): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const prompt = `
      Act as a professional career coach for the Indian job market.
      Write a tailored, professional cover letter for the role of "${role}".
      
      Resume Context:
      ${resumeText.substring(0, 3000)}

      Requirements:
      1. Tone: Professional, enthusiastic, but grounded (not overly flowery).
      2. Length: Concise (under 250 words).
      3. Content: Highlight 2-3 specific skills/projects from the resume that match the ${role} role.
      4. Format: Standard business letter body (Salutation -> Hook -> Skills -> Close).
      5. Placeholders: Use [brackets] for things the user must fill (e.g., [Company Name], [Hiring Manager Name]).
      6. Output: JUST the letter text, no markdown code blocks.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    return response.text || "Could not generate cover letter.";
  } catch (error) {
    console.error("Cover Letter Error", error);
    throw new Error("Could not generate cover letter.");
  }
};

export const analyzeResume = async (input: UserInput): Promise<CareerAnalysis> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    // 1. Determine Model & Config
    let modelName = 'gemini-2.5-flash';
    let tools: any[] = [];
    
    if (input.mode === 'deep') {
      modelName = 'gemini-3-pro-preview';
    } else if (input.mode === 'search') {
      // Search mode uses Flash but with Google Search tool
      modelName = 'gemini-2.5-flash'; 
      tools = [{ googleSearch: {} }];
    } else if (input.imageData) {
       // Images handled by Flash usually, or Pro for better reasoning
       modelName = 'gemini-2.5-flash';
    }

    // 2. Construct Prompt Logic
    const quantityInstruction = input.moreRoles 
      ? "STRICT REQUIREMENT: You MUST generate between 8 to 12 distinct job roles. Enable HIGH ACCURACY mode: Analyze the resume deeply for transferable skills and niche opportunities. Do not provide fewer than 8 roles." 
      : "Generate a focused list of 5 to 7 distinct job roles. Use STANDARD ACCURACY: Prioritize the most direct and obvious matches for a quick overview.";

    const userPromptText = `
    CANDIDATE PROFILE INPUT:
    ${input.resumeText ? `RESUME TEXT:\n${input.resumeText}` : 'RESUME TEXT: (See attached image)'}
    
    PREFERENCES:
    - City: ${input.city || "India (General)"}
    - Exp Level: ${input.experienceLevel}
    - Years Exp: ${input.yearsExperience || "Not specified"}
    - Mode: ${input.mode}
    
    TASK:
    - ${quantityInstruction}
    - Analyze the profile and map to Indian market opportunities.

    ${input.mode === 'search' ? 'IMPORTANT: Use Google Search to find REAL current job trends and demand in India before generating the JSON.' : ''}
    `;

    // 3. Construct Parts (Text + Optional Image)
    const parts: any[] = [{ text: userPromptText }];
    
    if (input.imageData && input.imageMimeType) {
      parts.push({
        inlineData: {
          mimeType: input.imageMimeType,
          data: input.imageData
        }
      });
    }

    // 4. Call API
    // Ensure responseMimeType is NOT set when tools are used (search mode)
    const config: any = {
      systemInstruction: SYSTEM_PROMPT,
      tools: tools.length > 0 ? tools : undefined,
    };

    if (!tools.length) {
      config.responseMimeType = "application/json";
    }

    const response = await ai.models.generateContent({
      model: modelName,
      config: config,
      contents: [
        {
          role: "user",
          parts: parts,
        },
      ],
    });

    // 5. Parse Response
    let text = response.text;
    if (!text) throw new Error("No response text from Gemini");

    // Clean up markdown code blocks if present (likely in search mode)
    text = text.trim();
    if (text.startsWith("```")) {
      text = text.replace(/^```(json)?\s*/, "").replace(/\s*```$/, "");
    }

    const data = JSON.parse(text) as CareerAnalysis;

    // 6. Extract Grounding Metadata (if search was used)
    if (input.mode === 'search' && response.candidates?.[0]?.groundingMetadata?.groundingChunks) {
       const chunks = response.candidates[0].groundingMetadata.groundingChunks;
       data.grounding_urls = chunks
         .map((c: any) => c.web ? { uri: c.web.uri, title: c.web.title } : null)
         .filter((c: any) => c !== null);
    }

    return data;

  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw new Error("Failed to analyze profile. Please try again.");
  }
};