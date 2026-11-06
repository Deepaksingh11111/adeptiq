import os
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

api_key = os.getenv("GROQ_API_KEY")
model = os.getenv(
    "GROQ_MODEL",
    "openai/gpt-oss-120b"
)

if not api_key:
    print("ERROR: GROQ_API_KEY not found in .env file.")
    raise SystemExit(1)

try:
    client = Groq(api_key=api_key)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": "You are an educational quiz generator."
            },
            {
                "role": "user",
                "content": (
                    "Create one multiple-choice question about "
                    "computer networks. Give four options and "
                    "identify the correct answer."
                )
            }
        ],
        temperature=0.3
    )

    print("\nGROQ API SUCCESSFUL!")
    print("Model:", model)
    print("\nAI Response:\n")
    print(response.choices[0].message.content)

except Exception as error:
    print("\nGROQ API TEST FAILED")
    print(type(error).__name__)
    print(str(error))