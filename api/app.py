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
CORS(app, origins=["http://localhost:8080"])

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
    system_prompt = "You are a software engineer specializing in creating structured, detailed descriptions of UI components, especially in React and ChakraUI. For each component, break down the description into key sections and describe each part's role, function, and visual design in detail. Follow this structure: \n 1. Begin with an overview sentence describing the component’s overall purpose. \n 2. Organize the description into sections, each focusing on a specific part of the component, such as headers, resource metrics, links, and action buttons. For each section, include details on hierarchy, layout, icons, tooltips, colors, and spacing, explaining how they contribute to the user experience and component functionality. \n 3. Conclude with a sentence on the overall style and how it impacts usability. \n\n Ensure the response is cohesive and flows naturally, suitable for creating a meaningful vector embedding to match with the component’s code. Write in a single, well-structured paragraph, using descriptive language to vividly convey the component’s appearance and purpose. Avoid bullet points or lists; instead, use a narrative style that mimics a section-by-section breakdown, aiming for 150+ words."
    response = openai.chat.completions.create(
        model="gpt-4o",
        max_completion_tokens= 1024,
        temperature=0.4,
        messages=[
            {"role": "system", "content": system_prompt},
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