# LLM Benchmarking Script - Python with Hugging Face

import os
import json
import time
import argparse
import torch
import numpy as np
from tqdm import tqdm
from transformers import AutoModelForCausalLM, AutoTokenizer
from huggingface_hub import login
from transformers import pipeline

login(token = 'your_key')

def read_data_file(file_path):
    """Read JSON or JSONL data files."""
    print(f"Loading data from: {file_path}")
    
    with open(file_path, 'r') as f:
        if file_path.endswith('.jsonl'):
            data = []
            for line in f:
                line = line.strip()
                if line:
                    data.append(json.loads(line))
            return data
        else:
            data = json.load(f)
            if not isinstance(data, list):
                raise ValueError("JSON data is not an array")
            return data

def format_prompt(instruction, input_text="", model_name=""):

    """Format the prompt based on model type."""

    if "llama" in model_name.lower():
        if input_text and input_text.strip():

            prompt = f"<s>[INST] {instruction}\n\n{input_text} [/INST]"

        else:

            prompt = f"<s>[INST] {instruction} [/INST]"

    elif "phi" in model_name.lower():
        prompt = f"Instruct: {instruction}\n"

        if input_text and input_text.strip():

            prompt += f"Input: {input_text}\n"

        prompt += "Output: "

    elif "gemma" in model_name.lower():

        if input_text and input_text.strip():

            prompt = f"<start_of_turn>user\n{instruction}\n\n{input_text}<end_of_turn>\n<start_of_turn>model\n"

        else:

            prompt = f"<start_of_turn>user\n{instruction}<end_of_turn>\n<start_of_turn>model\n"

    elif "qwen" in model_name.lower():

        if input_text and input_text.strip():

            prompt = f"<|im_start|>user\n{instruction}\n\n{input_text}<|im_end|>\n<|im_start|>assistant\n"

        else:

            prompt = f"<|im_start|>user\n{instruction}<|im_end|>\n<|im_start|>assistant\n"

    elif "tinyllama" in model_name.lower() or "chat" in model_name.lower():

        if input_text and input_text.strip():

            prompt = f"<|user|>\n{instruction}\n\n{input_text}\n<|assistant|>\n"

        else:

            prompt = f"<|user|>\n{instruction}\n<|assistant|>\n"

    else:

        prompt = f"Below is an instruction that describes a task, paired with an input that provides further context. Write a response that appropriately completes the request.\n\nInstruction:\n{instruction}\n\n"

        if input_text and input_text.strip():

            prompt += f"Input:\n{input_text}\n\n"

        prompt += "Response:"

    return prompt

 
def generate_with_timing(model, tokenizer, prompt, device):

    """Generate text with timing metrics for each token."""
    model.eval()
    token_intervals = []

    start_time = time.time()

    first_token_time = None

    input_ids = tokenizer(prompt, return_tensors="pt").input_ids.to(device)

    input_token_count = input_ids.shape[1]
    with torch.no_grad():

        first_output = model.generate(

            input_ids,

            max_new_tokens=1,

            do_sample=True,

            temperature=1.0,

            top_p=1.0,

            return_dict_in_generate=True,

            output_scores=True

        )


    first_token_time = time.time()

    time_to_first_token = (first_token_time - start_time) * 1000  # ms

    all_output_tokens = []

    last_token_time = first_token_time

    current_input_ids = input_ids

    completion_token_count = 0

    for _ in range(512):  # Max 512 new tokens

        with torch.no_grad():

            outputs = model.generate(

                current_input_ids,

                max_new_tokens=1,

                do_sample=True,

                temperature=1.0,

                top_p=1.0,

                return_dict_in_generate=True

            )

        new_token = outputs.sequences[0, -1].unsqueeze(0)

        completion_token_count += 1

        all_output_tokens.append(new_token)

        current_input_ids = outputs.sequences

        current_time = time.time()

        token_interval = (current_time - last_token_time) * 1000  # ms

        token_intervals.append(token_interval)

        last_token_time = current_time

        if tokenizer.eos_token_id is not None and new_token.item() == tokenizer.eos_token_id:

            break

    end_time = time.time()

    total_inference_time = (end_time - start_time) * 1000  # ms

    if all_output_tokens:

        all_tokens = torch.cat(all_output_tokens, dim=0)

        generated_text = tokenizer.decode(all_tokens, skip_special_tokens=True)

    else:

        generated_text = ""

    total_time_seconds = total_inference_time / 1000

    prefill_time = time_to_first_token / 1000  # seconds

    decoding_time = (total_inference_time - time_to_first_token) / 1000  # seconds

    prefill_tokens_per_s = input_token_count / prefill_time if prefill_time > 0 else 0

    decode_tokens_per_s = (completion_token_count - 1) / decoding_time if decoding_time > 0 and completion_token_count > 1 else 0

    avg_time_between_tokens = sum(token_intervals) / len(token_intervals) if token_intervals else 0

    usage = {

        "prompt_tokens": input_token_count,

        "completion_tokens": completion_token_count,

        "total_tokens": input_token_count + completion_token_count,

        "extra": {

            "prefill_tokens_per_s": prefill_tokens_per_s,

            "decode_tokens_per_s": decode_tokens_per_s,

        }

    }

    normalized_latency = total_inference_time / completion_token_count if completion_token_count > 0 else 0

    return {

        "output": generated_text,

        "total_time": total_inference_time,

        "time_to_first_token": time_to_first_token,

        "token_intervals": token_intervals,

        "avg_time_between_tokens": avg_time_between_tokens,

        "usage": usage,

        "normalized_latency": normalized_latency

    }

 

def load_model_and_tokenizer(model_name, device="auto"):
    """Load model and tokenizer with appropriate settings."""
    print(f"Loading model: {model_name}")
    
    if device == "auto":
        if torch.backends.mps.is_available():
            device = torch.device("mps")
            print("Using MPS (Apple Silicon)")
        elif torch.cuda.is_available():
            device = torch.device("cuda")
            print("Using CUDA")
        else:
            device = torch.device("cpu")
            print("Using CPU")
    
    # For MPS (Apple Silicon), avoid using bfloat16
    dtype = torch.float16
    if str(device) == "mps":
        dtype = torch.float32
    
    try:
        tokenizer = AutoTokenizer.from_pretrained(model_name)
        print(f"Tokenizer loaded successfully")
    except Exception as e:
        print(f"Error loading tokenizer: {e}")
        return None, None
    
    try:
        start_time = time.time()
        model = AutoModelForCausalLM.from_pretrained(
            model_name,
            torch_dtype=dtype,
            device_map=device if device != "mps" else "cpu",  # MPS requires special handling
            low_cpu_mem_usage=True
        )
        if str(device) == "mps":
            model = model.to(device)
            
        load_time = (time.time() - start_time) * 1000  # ms
        print(f"Model loaded in {load_time:.2f} ms")
        
        return model, tokenizer
    except Exception as e:
        print(f"Error loading model: {e}")
        return None, None


def process_file_with_model(model_name, model, tokenizer, data_file, device):
    """Process a single JSON file with one model."""
    try:
     
        data = read_data_file(data_file)
        model_results = []
        
        inference_times = []
        time_to_first_token_times = []
        normalized_latencies = []
        token_intervals_all = []
        total_prefill_speed = 0
        total_decoding_speed = 0
        total_tokens = 0
        
        for i, sample in enumerate(tqdm(data, desc=f"Processing {os.path.basename(data_file)}")):
            instruction = sample.get('instruction', '')
            input_text = sample.get('input', '')
         
            prompt = format_prompt(instruction, input_text, model_name)
            
            result = generate_with_timing(model, tokenizer, prompt, device)
           
            inference_times.append(result["total_time"])
            time_to_first_token_times.append(result["time_to_first_token"])
            normalized_latencies.append(result["normalized_latency"])
            token_intervals_all.extend(result["token_intervals"])
            
            if result["usage"]["extra"]["prefill_tokens_per_s"] > 0:
                total_prefill_speed += result["usage"]["extra"]["prefill_tokens_per_s"]
            if result["usage"]["extra"]["decode_tokens_per_s"] > 0:
                total_decoding_speed += result["usage"]["extra"]["decode_tokens_per_s"]
            
            total_tokens += result["usage"]["completion_tokens"]
           
            model_results.append({
                "instruction": instruction,
                "input": input_text,
                "output": result["output"],
                "Prefill speed": f"{result['usage']['extra']['prefill_tokens_per_s']:.2f}",
                "Decoding speed": f"{result['usage']['extra']['decode_tokens_per_s']:.2f}",
                "Total inference time": f"{result['total_time']:.2f} ms",
                "Time to first token": f"{result['time_to_first_token']:.2f} ms",
            })
        
        avg_inference_time = sum(inference_times) / len(inference_times) if inference_times else 0
        avg_time_to_first_token = sum(time_to_first_token_times) / len(time_to_first_token_times) if time_to_first_token_times else 0
        avg_normalized_latency = sum(normalized_latencies) / len(normalized_latencies) if normalized_latencies else 0
        avg_time_between_tokens = sum(token_intervals_all) / len(token_intervals_all) if token_intervals_all else 0
        latency_metric = sum(inference_times) / total_tokens if total_tokens > 0 else 0
        avg_prefill_speed = total_prefill_speed / len(inference_times) if inference_times else 0
        avg_decoding_speed = total_decoding_speed / len(inference_times) if inference_times else 0
        summary = {
            "Average Inference Time": f"{avg_inference_time:.2f} ms",
            "Average Time to First Token": f"{avg_time_to_first_token:.2f} ms",
            "Average Normalized Latency": f"{avg_normalized_latency:.2f} ms/token",
            "Latency Metric (Total Inference Time / Total Tokens)": f"{latency_metric:.2f} ms/token",
            "Average Prefill Speed": f"{avg_prefill_speed:.2f} tokens/sec",
            "Average Decoding Speed": f"{avg_decoding_speed:.2f} tokens/sec",
            "Average Time Between Tokens": f"{avg_time_between_tokens:.2f} ms",
        }
        
        model_results.append(summary)
        print("\n" + "="*50)
        print(f"Results for {model_name} on {os.path.basename(data_file)}:")
        for metric, value in summary.items():
            print(f"{metric}: {value}")
        print("="*50 + "\n")
        
        return model_results
        
    except Exception as e:
        print(f"Error processing file {data_file} with model {model_name}: {e}")
        return []

def main():
    parser = argparse.ArgumentParser(description="Run LLM benchmarks using Hugging Face models")
    parser.add_argument("--models", nargs="+", 
                        help="List of model names to benchmark (overrides default list)")
    parser.add_argument("--json_files", nargs="+", required=True,
                        help="List of JSON files to process")
    parser.add_argument("--device", type=str, default="auto",
                        help="Device to run on: 'cuda', 'cpu', 'mps', or 'auto'")
    parser.add_argument("--output_dir", type=str, default="results",
                        help="Directory to save results")
    args = parser.parse_args()
    
    default_models = [
        "meta-llama/Llama-3.2-1B-Instruct",
        "Qwen/Qwen2.5-0.5B-Instruct",
        "microsoft/phi-2", 
        "TinyLlama/TinyLlama-1.1B-Chat-v1.0",
        "google/gemma-2-2b-it"
    ]

    models_to_benchmark = args.models if args.models else default_models

    os.makedirs(args.output_dir, exist_ok=True)

    for model_name in models_to_benchmark:
        print(f"\nBenchmarking model: {model_name}")
       
        model, tokenizer = load_model_and_tokenizer(model_name, device=args.device)
        if model is None or tokenizer is None:
            print(f"Skipping model {model_name} due to loading errors")
            continue
            
        for json_file in args.json_files:
            if not os.path.exists(json_file):
                print(f"Warning: File {json_file} not found. Skipping.")
                continue
                
            file_basename = os.path.basename(json_file)
            file_number = "001"
            if match := file_basename.split('.')[0].split('_'):
                if len(match) > 1 and match[1].isdigit():
                    file_number = match[1]
                    
            model_name_clean = model_name.replace("/", "-")
            if "/" in model_name:
                model_name_clean = model_name.split("/")[-1]
                
            results = process_file_with_model(model_name, model, tokenizer, json_file, model.device)
            
            output_file = os.path.join(args.output_dir, f"{model_name_clean}_{file_number}_results.json")
            with open(output_file, 'w') as f:
                json.dump(results, f, indent=2)
            print(f"Results saved to: {output_file}")
 
        del model
        del tokenizer
        torch.cuda.empty_cache() if torch.cuda.is_available() else None
        print(f"Finished benchmarking {model_name}\n")

if __name__ == "__main__":
    os.environ["TOKENIZERS_PARALLELISM"] = "false" 
    main()