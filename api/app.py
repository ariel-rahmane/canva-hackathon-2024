from flask import Flask, request, jsonify
from flask_cors import CORS
import chromadb
import os
import base64
import openai
from llama_index.core.settings import Settings
from llama_index.core import VectorStoreIndex
from llama_index.vector_stores.chroma import ChromaVectorStore
from werkzeug.utils import secure_filename
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


UPLOAD_FOLDER = './uploads'
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif'}
def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_image_description(base64_image):
    response = openai.chat.completions.create(
        model="gpt-4o",
        messages=[
            {"role": "system", "content": "You are a software engineer that can describe UI components written in React and ChakraUI. Reply only in one paragraph with no special characters. Descriptions include the structure of the component. Include only the description in the response."},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": "Describe this UI component"},
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:image/jpeg;base64,{base64_image}"
                        },
                    },
                ],
            }
        ],
        max_tokens=1024,
    )

    description = response.choices[0].message.content
    return description

@app.route('/api/upload', methods=['POST'])
def upload_file():
    message = request.form.get('message')
    image = request.files.get('image')

    if not message or not image:
        return jsonify({"error": "Message or image missing from request"}), 400

    print(message)
    print(image)

    base64_image = base64.b64encode(image.read()).decode("utf-8")

    try:
        description = get_image_description(base64_image)
        print(description)
        responses = retriever.retrieve(description)
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
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)