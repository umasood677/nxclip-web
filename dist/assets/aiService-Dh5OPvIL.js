class r extends Error{constructor(e,n="UNKNOWN"){super(e),this.name="AIError",this.code=n}}const i="gemini-2.5-flash",m={"gemini-flash-latest":i,"gemini-pro-latest":"gemini-2.5-pro","gemini-2.0-flash":i};function g(t){const e=(t||"").trim();return e?m[e]??e:i}async function A(t){return s({...t,model:g(t.model)})}async function s(t){try{const e=await fetch("/api/ai/generate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(t)});if(!e.ok){const n=await e.json();throw new Error(n.error||"AI Proxy request failed")}return await e.json()}catch(e){return h(e)}}function h(t){console.error("AI Service Error:",t);const e=(t==null?void 0:t.message)||String(t);throw e.includes("429")||e.toLowerCase().includes("rate limit")||e.toLowerCase().includes("quota")?new r("AI is currently under heavy load or rate limited. Please wait a moment and try again.","RATE_LIMIT"):e.includes("SAFETY")||e.toLowerCase().includes("safety filters")||e.toLowerCase().includes("blocked")||e.toLowerCase().includes("candidate")?new r("Content was flagged by AI safety filters. Please try a different, more appropriate prompt.","SAFETY_BLOCK"):e.toLowerCase().includes("api key")||e.includes("403")?new r("AI service configuration error. Please check your API key settings.","API_KEY_ERROR"):e.toLowerCase().includes("invalid")||e.includes("400")?new r("Invalid request sent to the AI. Please refine your prompt and try again.","INVALID_PROMPT"):new r(e||"An unexpected error occurred while connecting to the AI service.","UNKNOWN")}async function I(t,e=[],n=[],o){var c;const u=n.length>0?`

USER CREATIONS CONTEXT:
${n.map(a=>{var l;return`- Type: ${a.type}, Prompt: ${a.prompt||"N/A"}, Status: ${a.status}, Created: ${new Date(((l=a.createdAt)==null?void 0:l.seconds)*1e3).toLocaleDateString()}`}).join(`
`)}`:`

(No creation history found)`,d=`You are the nxclip.app AI Creator Coach, a premium expert in viral gaming content and channel growth. 

CORE MISSION: Help gamers use nxclip.app to its maximum potential to grow on YouTube, TikTok, and Instagram.

COACHING STYLE:
1. PRODUCT EXPERT: Proactively suggest how to use nxclip tools (Image Studio, Meme Generator, Clipper) to solve the user's growth problems.
2. ACTIONABLE: Always respond in brief, numbered steps. No fluff.
3. PLATFORM SPECIFIC: Give unique advice for YouTube Shorts vs TikTok FYP vs Instagram Reels.
4. STRATEGIC: Provide tactical advice on content strategy, identifying viral trends, and optimizing posting frequency.
5. GAMING FOCUSED: Use high-level gaming meta and terminology.
6. PERSONALIZED: Use the provided Creator Profile and Creation Context to tailor your advice specifically to the user's niche and audience.

When a user asks for advice, ALWAYS include a tip on how they can use an nxclip feature to achieve that result faster.

If the user asks about their specific creations (e.g., "Why was my clip rejected?", "How can I improve my recent memes?"), use the provided creation context to give specific feedback.${o?`

CREATOR PROFILE CONTEXT:
- Name/Handle: ${o.creatorName||"N/A"}
- Games Played: ${((c=o.games)==null?void 0:c.join(", "))||"N/A"}
- Target Audience: ${o.audience||"N/A"}
- Content Goals: ${o.goal||"N/A"}
- Posting Frequency: ${o.frequency||"N/A"}`:`

(No creator profile found)`}${u}`,p=[...e.map(a=>({role:a.role==="user"?"user":"model",parts:[{text:a.text}]})),{role:"user",parts:[{text:t}]}];return(await s({model:"gemini-3.6-flash",contents:p,config:{systemInstruction:d}})).text}async function w(t){const e=await s({model:"gemini-3.6-flash",contents:`Generate 3 catchy, professional gaming social media captions for an image described as: "${t}". 
    Each caption should include 3-5 relevant gaming hashtags. 
    Return the result as a JSON array of strings.`,config:{responseMimeType:"application/json",responseSchema:{type:"ARRAY",items:{type:"STRING",description:"A single social media caption with hashtags."}}}});return e.text?JSON.parse(e.text):[]}async function C(t){const e=await s({model:"gemini-3.6-flash",contents:`Generate a catchy, short title (max 5 words) for a gaming creation described as: "${t}". 
    Return the result as a JSON object with a single "title" field.`,config:{responseMimeType:"application/json",responseSchema:{type:"OBJECT",properties:{title:{type:"STRING"}},required:["title"]}}});return e.text?JSON.parse(e.text).title:""}export{r as A,C as a,w as b,I as c,A as g};
