import chromadb
import json
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.core import VectorStoreIndex, SimpleDirectoryReader, StorageContext
from llama_index.core.settings import Settings
from llama_index.core.schema import TextNode
from llama_index.llms.openai import OpenAI, Tokenizer
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.llm = OpenAI(model="gpt-4")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")

db = chromadb.PersistentClient(path="./chroma_database")
chroma_collection = db.get_or_create_collection("libs")

vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
storage_context = StorageContext.from_defaults(vector_store=vector_store)

# Testing with a small amount of nodes for now
with open('./parser_output/nodes_5.json', 'r') as f:
    chunks = json.load(f)

nodes = [TextNode(text=chunk['code'], metadata=chunk['metadata']) for chunk in chunks]

index = VectorStoreIndex(nodes, storage_context=storage_context, show_progress=True)