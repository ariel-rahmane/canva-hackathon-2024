import chromadb
import json
import numpy as np
from llama_index.core.settings import Settings
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding

Settings.llm = OpenAI(model="gpt-4")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")

db = chromadb.PersistentClient(path="chroma_database")
chroma_collection = db.get_or_create_collection("libs")

vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
retriever = VectorStoreIndex.from_vector_store(vector_store).as_retriever(similarity_top_k=1)

response = retriever.retrieve("A function that lets you know what tab is being selected")
print("score: ", response[0].score)
print(response[0].node.text)

