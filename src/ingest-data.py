import chromadb
import json
import os
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.core.settings import Settings
from tiktoken import get_encoding
from llama_index.core.schema import TextNode
from llama_index.llms.openai import OpenAI, Tokenizer
from llama_index.embeddings.openai import OpenAIEmbedding

# ------------ COST ANALYSIS -----------------
import tiktoken
from llama_index.core.callbacks import CallbackManager, TokenCountingHandler
from llama_index.core.llms import MockLLM
from llama_index.core import MockEmbedding
token_counter = TokenCountingHandler(
    tokenizer=tiktoken.encoding_for_model("text-embedding-3-large").encode
)
encoding = get_encoding("cl100k_base")
MAX_TOKENS = 8191
callback_manager = CallbackManager([token_counter])
Settings.callback_manager = callback_manager
def printResults(): 
  print(
      "Embedding Tokens: ",
      token_counter.total_embedding_token_count,
      "\n",
      "LLM Prompt Tokens: ",
      token_counter.prompt_llm_token_count,
      "\n",
      "LLM Completion Tokens: ",
      token_counter.completion_llm_token_count,
      "\n",
      "Total LLM Token Count: ",
      token_counter.total_llm_token_count,
      "\n",
  )
# ---------------------------------------------

# Uncomment these 2 lines for cost analysis
Settings.llm = MockLLM(max_tokens=8191)
Settings.embed_model = MockEmbedding(embed_dim=3072)

# Comment the below two lines for cost analysis
# Settings.llm = OpenAI(model="gpt-3.5-turbo")
# Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")

db = chromadb.PersistentClient(path="./full_database")
chroma_collection = db.get_or_create_collection("leonardo_platform")

vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

input_dir = './full_code_output'

chunks = []
for filename in os.listdir(input_dir):
    if filename.endswith('.json'):
        print("Processing file: ", filename)
        file_path = os.path.join(input_dir, filename)
        with open(file_path, 'r') as f:
            file_chunks = json.load(f)
            chunks.extend(file_chunks)

nodes = [TextNode(text=chunk['code'], metadata=chunk['metadata']) for chunk in chunks]

for node in nodes:
    tokens = encoding.encode(node.text)
    token_count = len(tokens)

    if token_count > MAX_TOKENS:
        print(f"Node exceeds {MAX_TOKENS} tokens. Token count: {token_count}. Location: {node.metadata['fileName']}")

# index = VectorStoreIndex(
#   nodes,
#   storage_context=storage_context, # Comment this line for cost analysis
#   show_progress=True
# )