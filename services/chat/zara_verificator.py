import httpx
import json
import re
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass

@dataclass
class RouteDecision:
    intent: str
    needs_retrieval: bool
    needs_improvement: bool
    latency_budget_ms: int
    max_tokens: int
    confidence: float

class ZaraVerificator:
    """Smart routing system for Zara AI to optimize response time and quality"""
    
    def __init__(self, embed_service_url: str):
        self.embed_service_url = embed_service_url
        
        # Predefined patterns for fast routing
        self.fast_patterns = {
            'greeting': [
                r'^(hi|hello|hey|good morning|good afternoon)[.!?]?\s*$',
                r'^(what\'s up|how are you)[.!?]?\s*$'
            ],
            'meta': [
                r'^who (are|r) you\??$',
                r'^who is zara\??$',
                r'^what (are|r) you\??$',
                r'^what can you do\??$',
                r'^(help|version|explain how you work)[.!?]?\s*$',
                r'^tell me about yourself\??$'
            ],
            'thanks': [
                r'^(thanks?|thank you|thx|ty)[.!?]?\s*$',
                r'^(bye|goodbye|see you)[.!?]?\s*$'
            ]
        }
        
        # Fast response templates
        self.fast_responses = {
            'greeting': "Hello! I'm Zara, your AI Knowledge Navigator Assistant. I'm here to help you find anything you need to know from your documents! How can I assist you today?",
            'meta': "I'm Zara, your AI Knowledge Navigator Assistant! I can help you:\n\n• Search through your uploaded documents\n• Answer questions based on your data\n• Create visualizations and charts\n• Analyze your files and provide insights\n\nWhat would you like to explore in your documents today?",
            'thanks': "You're welcome! Feel free to ask me anything about your documents or data anytime. I'm here to help! 😊"
        }
        
        # Intent classification seeds for embedding similarity
        self.intent_seeds = {
            'document_query': [
                "what's in my document", "summarize file", "find information in pdf",
                "search document", "show me content from", "what does the report say"
            ],
            'data_analysis': [
                "create chart", "show graph", "analyze data", "plot trends",
                "compare data", "statistics", "visualization"
            ],
            'file_operations': [
                "upload file", "delete document", "list files", "manage documents"
            ],
            'clarification': [
                "I don't understand", "can you explain", "what do you mean",
                "clarify", "more details"
            ]
        }
    
    async def verify_and_route(self, user_input: str, user_id: str = "demo") -> RouteDecision:
        """Main verification and routing function"""
        
        # Stage 1: Fast pattern matching for common queries
        fast_result = self._check_fast_patterns(user_input)
        if fast_result:
            return fast_result
        
        # Stage 2: Check if it's a very short query (likely trivial)
        if len(user_input.split()) <= 3:
            return RouteDecision(
                intent='trivial',
                needs_retrieval=False,
                needs_improvement=False,
                latency_budget_ms=400,
                max_tokens=150,
                confidence=0.8
            )
        
        # Stage 3: Intent classification via embeddings
        intent, confidence = await self._classify_intent(user_input)
        
        # Stage 4: Decide routing based on intent and confidence
        return self._make_routing_decision(intent, confidence, user_input)
    
    def _check_fast_patterns(self, user_input: str) -> Optional[RouteDecision]:
        """Check if input matches fast response patterns"""
        clean_input = user_input.lower().strip()
        print(f"🔍 Checking fast patterns for: '{clean_input}'")
        
        for intent_type, patterns in self.fast_patterns.items():
            for pattern in patterns:
                if re.match(pattern, clean_input, re.IGNORECASE):
                    print(f"✨ Fast pattern matched! Intent: {intent_type}, Pattern: {pattern}")
                    return RouteDecision(
                        intent=intent_type,
                        needs_retrieval=False,
                        needs_improvement=False,
                        latency_budget_ms=300,
                        max_tokens=120,
                        confidence=0.95
                    )
        
        print(f"🔴 No fast patterns matched for: '{clean_input}'")
        return None
    
    async def _classify_intent(self, user_input: str) -> Tuple[str, float]:
        """Classify intent using embedding similarity"""
        try:
            # Get embedding for user input
            async with httpx.AsyncClient(timeout=5) as client:
                response = await client.post(
                    f"{self.embed_service_url}/embeddings",
                    json={"model": "mxbai-embed-large:latest", "input": [user_input]}
                )
                if response.status_code == 200:
                    user_embedding = response.json()["data"][0]["embedding"]
                else:
                    return "general", 0.5
            
            best_intent = "general"
            best_score = 0.0
            
            # Compare with intent seeds
            for intent, seeds in self.intent_seeds.items():
                for seed in seeds:
                    seed_response = await client.post(
                        f"{self.embed_service_url}/embeddings",
                        json={"model": "mxbai-embed-large:latest", "input": [seed]}
                    )
                    if seed_response.status_code == 200:
                        seed_embedding = seed_response.json()["data"][0]["embedding"]
                        similarity = self._cosine_similarity(user_embedding, seed_embedding)
                        if similarity > best_score:
                            best_score = similarity
                            best_intent = intent
            
            return best_intent, best_score
            
        except Exception as e:
            print(f"Intent classification failed: {e}")
            return "general", 0.5
    
    def _cosine_similarity(self, vec1: List[float], vec2: List[float]) -> float:
        """Calculate cosine similarity between two vectors"""
        dot_product = sum(a * b for a, b in zip(vec1, vec2))
        magnitude1 = sum(a * a for a in vec1) ** 0.5
        magnitude2 = sum(b * b for b in vec2) ** 0.5
        
        if magnitude1 * magnitude2 == 0:
            return 0.0
        return dot_product / (magnitude1 * magnitude2)
    
    def _make_routing_decision(self, intent: str, confidence: float, user_input: str) -> RouteDecision:
        """Make final routing decision based on intent and confidence"""
        
        # High confidence document queries
        if intent == 'document_query' and confidence > 0.7:
            return RouteDecision(
                intent='document_query',
                needs_retrieval=True,
                needs_improvement=True,
                latency_budget_ms=3000,
                max_tokens=800,
                confidence=confidence
            )
        
        # Data analysis requests
        elif intent == 'data_analysis' and confidence > 0.6:
            return RouteDecision(
                intent='data_analysis',
                needs_retrieval=True,
                needs_improvement=True,
                latency_budget_ms=3500,
                max_tokens=1000,
                confidence=confidence
            )
        
        # File operations
        elif intent == 'file_operations':
            return RouteDecision(
                intent='file_operations',
                needs_retrieval=False,
                needs_improvement=False,
                latency_budget_ms=1000,
                max_tokens=300,
                confidence=confidence
            )
        
        # Low confidence or clarification needed
        elif confidence < 0.5 or intent == 'clarification':
            return RouteDecision(
                intent='clarification',
                needs_retrieval=False,
                needs_improvement=True,
                latency_budget_ms=1500,
                max_tokens=400,
                confidence=confidence
            )
        
        # Default case
        else:
            return RouteDecision(
                intent='general',
                needs_retrieval=True,
                needs_improvement=True,
                latency_budget_ms=2500,
                max_tokens=600,
                confidence=confidence
            )
    
    def get_fast_response(self, intent: str) -> str:
        """Get pre-cached fast response for trivial queries"""
        return self.fast_responses.get(intent, "I'm here to help! What would you like to know?")

# Global instance
verificator = None

def get_verificator(embed_service_url: str) -> ZaraVerificator:
    """Get or create verificator instance"""
    global verificator
    if verificator is None:
        verificator = ZaraVerificator(embed_service_url)
    return verificator