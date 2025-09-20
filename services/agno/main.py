import os, json, asyncio, httpx
from pathlib import Path
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import logging

# Load environment variables
load_dotenv(Path(__file__).resolve().parents[2] / ".env")

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="Agno AI Agent Service",
    description="Multi-agent AI service for prompt restructuring and response evaluation",
    version="1.0.0"
)

# Environment configuration
LITELLM_BASE = os.environ["LITELLM_BASE"]
LITELLM_API_KEY = os.getenv("LITELLM_API_KEY", "sk-local")
GENERATION_MODEL = os.getenv("RAG_GENERATION_MODEL", "deepseek-r1:14b")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Pydantic models
class PromptRequest(BaseModel):
    original_prompt: str
    context: Optional[str] = None
    user_intent: Optional[str] = None
    domain: Optional[str] = "general"

class ResponseRequest(BaseModel):
    response_content: str
    original_prompt: str
    response_format: Optional[str] = "text"  # text, table, viz, tool
    evaluation_criteria: Optional[List[str]] = ["clarity", "completeness", "relevance"]

class AgentResponse(BaseModel):
    success: bool
    agent_type: str
    original_input: str
    processed_output: str
    confidence_score: float
    reasoning: str
    suggestions: Optional[List[str]] = []

# AI Generation Helper
async def call_llm(prompt: str, max_retries: int = 2) -> str:
    """Call LLM with fallback strategy"""
    for attempt in range(max_retries + 1):
        try:
            # Try LiteLLM first
            async with httpx.AsyncClient(timeout=120) as client:
                response = await client.post(
                    f"{LITELLM_BASE}/chat/completions",
                    headers={"Authorization": f"Bearer {LITELLM_API_KEY}"},
                    json={
                        "model": GENERATION_MODEL,
                        "messages": [{"role": "user", "content": prompt}],
                        "temperature": 0.7,
                        "max_tokens": 2000
                    }
                )
                
                if response.status_code == 200:
                    data = response.json()
                    return data["choices"][0]["message"]["content"]
                else:
                    logger.warning(f"LiteLLM failed with status {response.status_code}: {response.text}")
                    
        except Exception as e:
            logger.warning(f"LiteLLM attempt {attempt + 1} failed: {e}")
            
            # Fallback to OpenAI on last attempt
            if attempt == max_retries and OPENAI_API_KEY and OPENAI_API_KEY != "sk-your-openai-api-key-here":
                try:
                    logger.info("Falling back to OpenAI...")
                    async with httpx.AsyncClient(timeout=120) as client:
                        response = await client.post(
                            "https://api.openai.com/v1/chat/completions",
                            headers={"Authorization": f"Bearer {OPENAI_API_KEY}"},
                            json={
                                "model": "gpt-4o-mini",
                                "messages": [{"role": "user", "content": prompt}],
                                "temperature": 0.7,
                                "max_tokens": 2000
                            }
                        )
                        
                        if response.status_code == 200:
                            data = response.json()
                            return data["choices"][0]["message"]["content"]
                            
                except Exception as openai_error:
                    logger.error(f"OpenAI fallback failed: {openai_error}")
            
            if attempt < max_retries:
                await asyncio.sleep(2 ** attempt)  # Exponential backoff
    
    raise HTTPException(500, "All LLM providers failed")

@app.get("/")
async def root():
    return {
        "service": "agno-ai-agent",
        "status": "running",
        "version": "1.0.0",
        "agents": ["prompt_restructurer", "response_evaluator"],
        "models": {
            "primary": GENERATION_MODEL,
            "fallback": "openai/gpt-4o-mini" if OPENAI_API_KEY else "none"
        }
    }

@app.post("/agent/restructure-prompt", response_model=AgentResponse)
async def restructure_prompt(request: PromptRequest) -> AgentResponse:
    """Agent 1: Prompt Restructuring Agent"""
    
    restructure_system_prompt = f"""
You are a Prompt Restructuring Agent specializing in optimizing user queries for AI systems.

Your task is to analyze the user's original prompt and restructure it to be:
1. More specific and actionable
2. Better formatted for AI processing
3. Enhanced with relevant context
4. Optimized for the target domain: {request.domain}

Guidelines:
- Preserve the user's original intent
- Add clarifying questions if the prompt is ambiguous
- Structure complex queries into clear steps
- Include relevant context markers
- Suggest alternative phrasings if beneficial

Original Prompt: "{request.original_prompt}"
Context: "{request.context or 'No additional context provided'}"
User Intent: "{request.user_intent or 'Not specified'}"
Domain: "{request.domain}"

Provide your response in the following JSON format:
{{
    "restructured_prompt": "<improved version of the prompt>",
    "confidence_score": <0.0-1.0>,
    "reasoning": "<explanation of changes made>",
    "suggestions": ["<list of additional suggestions>"],
    "improvements_made": ["<list of specific improvements>"]
}}
"""
    
    try:
        response = await call_llm(restructure_system_prompt)
        
        # Parse JSON response
        try:
            parsed_response = json.loads(response)
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            parsed_response = {
                "restructured_prompt": response,
                "confidence_score": 0.7,
                "reasoning": "Response could not be parsed as JSON, returning raw output",
                "suggestions": [],
                "improvements_made": ["Basic restructuring applied"]
            }
        
        return AgentResponse(
            success=True,
            agent_type="prompt_restructurer",
            original_input=request.original_prompt,
            processed_output=parsed_response.get("restructured_prompt", response),
            confidence_score=parsed_response.get("confidence_score", 0.7),
            reasoning=parsed_response.get("reasoning", "Prompt restructured successfully"),
            suggestions=parsed_response.get("suggestions", [])
        )
        
    except Exception as e:
        logger.error(f"Prompt restructuring failed: {e}")
        return AgentResponse(
            success=False,
            agent_type="prompt_restructurer",
            original_input=request.original_prompt,
            processed_output=request.original_prompt,  # Return original as fallback
            confidence_score=0.0,
            reasoning=f"Agent failed: {str(e)}",
            suggestions=["Try simplifying the prompt", "Check network connectivity"]
        )

@app.post("/agent/evaluate-response", response_model=AgentResponse)
async def evaluate_response(request: ResponseRequest) -> AgentResponse:
    """Agent 2: Response Evaluation Agent"""
    
    evaluation_system_prompt = f"""
You are a Response Evaluation Agent that analyzes and optimizes AI-generated responses.

Your task is to evaluate the given response and suggest improvements based on:
Evaluation Criteria: {', '.join(request.evaluation_criteria or ['clarity', 'completeness', 'relevance'])}
Response Format: {request.response_format}

Original Prompt: "{request.original_prompt}"
Response Content: "{request.response_content}"

Evaluate the response on:
1. **Clarity**: Is the response clear and easy to understand?
2. **Completeness**: Does it fully address the original prompt?
3. **Relevance**: Is the content relevant and on-topic?
4. **Structure**: Is the response well-organized?
5. **Actionability**: Does it provide actionable information when needed?

Provide your evaluation in the following JSON format:
{{
    "evaluation_score": <0.0-1.0>,
    "improved_response": "<enhanced version of the response>",
    "strengths": ["<list of response strengths>"],
    "weaknesses": ["<list of areas for improvement>"],
    "specific_improvements": ["<list of specific changes made>"],
    "reasoning": "<detailed explanation of evaluation>",
    "confidence_score": <0.0-1.0>
}}
"""
    
    try:
        response = await call_llm(evaluation_system_prompt)
        
        # Parse JSON response
        try:
            parsed_response = json.loads(response)
        except json.JSONDecodeError:
            # Fallback if JSON parsing fails
            parsed_response = {
                "improved_response": response,
                "evaluation_score": 0.7,
                "confidence_score": 0.7,
                "reasoning": "Response could not be parsed as JSON, returning raw output",
                "strengths": [],
                "weaknesses": [],
                "specific_improvements": ["Basic evaluation applied"]
            }
        
        return AgentResponse(
            success=True,
            agent_type="response_evaluator",
            original_input=request.response_content,
            processed_output=parsed_response.get("improved_response", response),
            confidence_score=parsed_response.get("confidence_score", 0.7),
            reasoning=parsed_response.get("reasoning", "Response evaluated successfully"),
            suggestions=parsed_response.get("specific_improvements", [])
        )
        
    except Exception as e:
        logger.error(f"Response evaluation failed: {e}")
        return AgentResponse(
            success=False,
            agent_type="response_evaluator",
            original_input=request.response_content,
            processed_output=request.response_content,  # Return original as fallback
            confidence_score=0.0,
            reasoning=f"Agent failed: {str(e)}",
            suggestions=["Try simplifying the evaluation criteria", "Check network connectivity"]
        )

@app.post("/agent/multi-agent-process")
async def multi_agent_process(request: Dict[str, Any]):
    """Multi-agent processing pipeline: Restructure -> Process -> Evaluate"""
    
    original_prompt = request.get("prompt", "")
    context = request.get("context", "")
    domain = request.get("domain", "general")
    
    try:
        # Step 1: Restructure the prompt
        logger.info(f"Starting multi-agent process for prompt: {original_prompt[:100]}...")
        
        restructure_req = PromptRequest(
            original_prompt=original_prompt,
            context=context,
            domain=domain
        )
        
        restructured = await restructure_prompt(restructure_req)
        
        if not restructured.success:
            return {
                "success": False,
                "error": "Prompt restructuring failed",
                "original_prompt": original_prompt,
                "restructured_prompt": original_prompt  # Fallback
            }
        
        # Step 2: Here you would process with your main AI system
        # For now, we'll simulate a response processing step
        enhanced_prompt = restructured.processed_output
        
        # This is where you'd call your main RAG/Chat system
        # For demo purposes, we'll create a simulated response
        simulated_response = f"Processed response for: {enhanced_prompt}"
        
        # Step 3: Evaluate and improve the response
        evaluation_req = ResponseRequest(
            response_content=simulated_response,
            original_prompt=original_prompt,
            response_format="text"
        )
        
        evaluated = await evaluate_response(evaluation_req)
        
        return {
            "success": True,
            "pipeline_results": {
                "original_prompt": original_prompt,
                "restructured_prompt": restructured.processed_output,
                "restructure_confidence": restructured.confidence_score,
                "restructure_reasoning": restructured.reasoning,
                "enhanced_response": evaluated.processed_output if evaluated.success else simulated_response,
                "evaluation_confidence": evaluated.confidence_score if evaluated.success else 0.0,
                "evaluation_reasoning": evaluated.reasoning if evaluated.success else "Evaluation failed",
                "suggestions": {
                    "prompt_improvements": restructured.suggestions,
                    "response_improvements": evaluated.suggestions if evaluated.success else []
                }
            }
        }
        
    except Exception as e:
        logger.error(f"Multi-agent processing failed: {e}")
        return {
            "success": False,
            "error": str(e),
            "original_prompt": original_prompt,
            "fallback_response": "Multi-agent processing unavailable, using fallback"
        }

@app.get("/test/agents")
async def test_agents():
    """Test both agents with sample data"""
    
    # Test prompt restructuring
    test_prompt = PromptRequest(
        original_prompt="tell me about oil production",
        context="User is asking about petroleum industry",
        domain="petroleum_engineering"
    )
    
    restructure_result = await restructure_prompt(test_prompt)
    
    # Test response evaluation
    test_response = ResponseRequest(
        response_content="Oil production involves extracting crude oil from underground reservoirs through drilling and pumping operations.",
        original_prompt="tell me about oil production",
        response_format="text"
    )
    
    evaluation_result = await evaluate_response(test_response)
    
    return {
        "test_results": {
            "prompt_restructuring": {
                "success": restructure_result.success,
                "confidence": restructure_result.confidence_score,
                "output_preview": restructure_result.processed_output[:200] + "..." if len(restructure_result.processed_output) > 200 else restructure_result.processed_output
            },
            "response_evaluation": {
                "success": evaluation_result.success,
                "confidence": evaluation_result.confidence_score,
                "output_preview": evaluation_result.processed_output[:200] + "..." if len(evaluation_result.processed_output) > 200 else evaluation_result.processed_output
            }
        },
        "timestamp": asyncio.get_event_loop().time()
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test LLM connectivity
        test_response = await call_llm("Hello, respond with 'OK' if you can hear me.")
        return {
            "status": "healthy",
            "llm_connectivity": "ok" if "ok" in test_response.lower() else "partial",
            "timestamp": asyncio.get_event_loop().time()
        }
    except Exception as e:
        return {
            "status": "degraded",
            "llm_connectivity": "failed",
            "error": str(e),
            "timestamp": asyncio.get_event_loop().time()
        }

if __name__ == "__main__":
    import uvicorn
    agno_port = int(os.getenv("AGNO_PORT", 9010))
    uvicorn.run(app, host="0.0.0.0", port=agno_port)