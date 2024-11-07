import chromadb
import json
import os
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.core.settings import Settings
from llama_index.core.schema import TextNode
from llama_index.llms.openai import OpenAI, Tokenizer
from llama_index.embeddings.openai import OpenAIEmbedding

# Uncomment this for cost analysis
# ------------ COST ANALYSIS -----------------
# import tiktoken
# from llama_index.core.callbacks import CallbackManager, TokenCountingHandler
# from llama_index.core.llms import MockLLM
# from llama_index.core import MockEmbedding
# Settings.llm = MockLLM(max_tokens=8191)
# Settings.embed_model = MockEmbedding(embed_dim=3072)
# token_counter = TokenCountingHandler(
#     tokenizer=tiktoken.encoding_for_model("text-embedding-3-large").encode
# )
# callback_manager = CallbackManager([token_counter])
# Settings.callback_manager = callback_manager
# def printResults(): 
#   print(
#       "Embedding Tokens: ",
#       token_counter.total_embedding_token_count,
#       "\n",
#       "LLM Prompt Tokens: ",
#       token_counter.prompt_llm_token_count,
#       "\n",
#       "LLM Completion Tokens: ",
#       token_counter.completion_llm_token_count,
#       "\n",
#       "Total LLM Token Count: ",
#       token_counter.total_llm_token_count,
#       "\n",
#   )
# ---------------------------------------------

# Comment the below two lines for cost analysis
Settings.llm = OpenAI(model="gpt-4")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")

db = chromadb.PersistentClient(path="./chroma_database")
chroma_collection = db.get_or_create_collection("libs")

vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

output_dir = './parser_output'

chunks = []
for filename in os.listdir(output_dir):
    if filename.endswith('.json'):
        print("Processing file: ", filename)
        file_path = os.path.join(output_dir, filename)
        with open(file_path, 'r') as f:
            file_chunks = json.load(f)
            chunks.extend(file_chunks)

nodes = [TextNode(text=chunk['code'], metadata=chunk['metadata']) for chunk in chunks]

index = VectorStoreIndex(
  nodes,
  storage_context=storage_context, # Comment this line for cost analysis
  show_progress=True
)
