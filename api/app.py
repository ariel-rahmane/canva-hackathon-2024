from flask import Flask, request, jsonify
from flask_cors import CORS
import chromadb
from llama_index.core.settings import Settings
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore
from llama_index.llms.openai import OpenAI
from llama_index.embeddings.openai import OpenAIEmbedding
from llama_index.core.vector_stores import (
    MetadataFilter,
    MetadataFilters,
    FilterOperator,
)

TOP_K = 10

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000"])

Settings.llm = OpenAI(model="gpt-3.5-turbo")
Settings.embed_model = OpenAIEmbedding(model="text-embedding-3-large")

db = chromadb.PersistentClient(path="full_database")
chroma_collection = db.get_or_create_collection("leonardo_platform")

filters = MetadataFilters(
    filters=[
        MetadataFilter(key="type", operator=FilterOperator.NIN, value=["ImportDeclaration", "ExportDeclaration", "ExpressionStatement", "ExportAssignment"]),
    ]
)


vector_store = ChromaVectorStore(chroma_collection=chroma_collection)
retriever = VectorStoreIndex.from_vector_store(vector_store).as_retriever(filters=filters, similarity_top_k=TOP_K)

@app.route('/api/chat', methods=['POST'])
def query():
    data = request.get_json()
    if not data or 'message' not in data:
        return jsonify({"error": "No query message provided"}), 400

    query_text = data['message']
    
    responses = retriever.retrieve(query_text)
    result = [
        {
          "score": response.score,
          "code": response.node.text,
          "fileLocation": response.node.metadata["fileLocation"],
          "fileName": response.node.metadata["fileName"],
          "startLineNumber": response.node.metadata["startLineNumber"],
          "endLineNumber": response.node.metadata["endLineNumber"],
        }
        for response in responses
    ]

    return jsonify(result)

if __name__ == '__main__':
    app.run(debug=True)