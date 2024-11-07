import chromadb
import json
import numpy as np
from llama_index.core.settings import Settings
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

TOP_K = 3

Settings.llm = OpenAI(model="gpt-4")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")

db = chromadb.PersistentClient(path="chroma_database")
chroma_collection = db.get_or_create_collection("libs")

vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
retriever = VectorStoreIndex.from_vector_store(vector_store).as_retriever(similarity_top_k=TOP_K)

responses = retriever.retrieve("This function converts a file into a string-based format that represents its contents, creating a link-like reference to the file’s data. It uses a helper to read the file, and once complete, returns the result or an error if the reading fails.")
for response in responses:
  print("score: ", response.score)
  print(response.node.text)