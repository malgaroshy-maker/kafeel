import os
import sys

# Try importing either of the SDKs available
try:
    from google import genai
    from google.genai import types
    SDK_VERSION = "new"
except ImportError:
    try:
        import google.generativeai as genai
        SDK_VERSION = "old"
    except ImportError:
        print("Neither google-genai nor google-generativeai is installed.")
        sys.exit(1)

def main():
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        print("GEMINI_API_KEY not found.")
        sys.exit(1)

    audio_file_path = "04-30-2026 12.40.mp3"
    print(f"Uploading {audio_file_path} using SDK version: {SDK_VERSION}...")
    
    if SDK_VERSION == "new":
        client = genai.Client(api_key=api_key)
        uploaded_audio = client.files.upload(file=audio_file_path)
    else:
        genai.configure(api_key=api_key)
        uploaded_audio = genai.upload_file(path=audio_file_path)

    # Read the markdown files
    def read_file(path):
        try:
            with open(path, "r", encoding="utf-8") as f:
                return f.read()
        except Exception as e:
            return f"Error reading {path}: {e}"

    prd = read_file("prd.md")
    plan = read_file("Plan.md")
    roadmap = read_file("roadmap.md")
    calc = read_file("calculater.md")

    prompt = f"""
Please listen to the attached audio file. The audio file describes a project requirements and features in Arabic.
Then, review the current project files below:

--- PRD ---
{prd}

--- PLAN ---
{plan}

--- ROADMAP ---
{roadmap}

--- CALCULATOR ---
{calc}

Task:
Analyze the audio file and compare the project described in the voice recording with the current Kafeel project described in the files above.
Please output your response as a comprehensive markdown document in Arabic (since the project and likely the audio are in Arabic) that covers:
1. ملخص المشروع من التسجيل الصوتي (Summary of the project from the audio).
2. مقارنة بين المشروع في التسجيل والمشروع الحالي (Comparison between the audio and the current project).
3. الميزات المفقودة أو التي تم نسيانها (What did we forget or miss in the current project that was mentioned in the audio recording? Be specific).

Make sure the output is well-structured using markdown headings, lists, and tables if necessary.
"""
    
    print("Generating response...")
    
    if SDK_VERSION == "new":
        import time
        max_retries = 3
        for attempt in range(max_retries):
            try:
                response = client.models.generate_content(
                    model='gemini-3-flash-preview',
                    contents=[uploaded_audio, prompt]
                )
                output_text = response.text
                break
            except Exception as e:
                print(f"Attempt {attempt+1} failed with error: {e}")
                if attempt == max_retries - 1:
                    raise
                print("Retrying in 10 seconds...")
                time.sleep(10)
    else:
        model = genai.GenerativeModel('gemini-3-flash-preview')
        response = model.generate_content([uploaded_audio, prompt])
        output_text = response.text

    with open("audio_project_comparison.md", "w", encoding="utf-8") as f:
        f.write(output_text)
        
    print("Done. Wrote to audio_project_comparison.md")

if __name__ == "__main__":
    main()
