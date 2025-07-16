import json
import os
from deepeval import evaluate
from deepeval.dataset import EvaluationDataset
from deepeval.test_case import LLMTestCase
from deepeval.metrics import (
    HallucinationMetric,
    AnswerRelevancyMetric,
    BiasMetric,
    ToxicityMetric,
    FaithfulnessMetric,
)

os.environ["OPENAI_API_KEY"] = ""

def load_ground_truth(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def load_model_results(file_path):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except FileNotFoundError:
        print(f"Warning: {file_path} not found. Returning empty list.")
        return []

def create_test_cases(ground_truth_data, model_results):
    test_cases = []
    model_outputs_by_input = {}
    for result in model_results:
        if 'input' in result:
            model_outputs_by_input[result['input']] = result.get('output', '')

    for item in ground_truth_data:
        instruction = item.get('instruction', '')
        input_text = item.get('input', '')
        expected_output = item.get('output', '')
        model_output = model_outputs_by_input.get(input_text, '')
        
        if not model_output:
            print(f"Warning: No model output found for input: {input_text[:50]}...")
            continue
    
        context_items = []
        if instruction:
            context_items.append(instruction)
        if expected_output:
            context_items.append(expected_output)
        if not context_items:
            context_items = ["No context available"]
    
        test_case = LLMTestCase(
            input=input_text,
            actual_output=model_output,
            expected_output=expected_output,
            context=context_items
        )
        test_cases.append(test_case)
    
    return test_cases

def evaluate_and_save(dataset, model_name, metrics_list):
    hallucination_metric = next((m for m in metrics_list if isinstance(m, HallucinationMetric)), None)
    answer_relevancy_metric = next((m for m in metrics_list if isinstance(m, AnswerRelevancyMetric)), None)
    bias_metric = next((m for m in metrics_list if isinstance(m, BiasMetric)), None)
    toxicity_metric = next((m for m in metrics_list if isinstance(m, ToxicityMetric)), None)
    faithfulness_metric = next((m for m in metrics_list if isinstance(m, FaithfulnessMetric)), None)
   
    dataset.evaluate(metrics_list)
    results_to_save = {
        "model_name": model_name,
        "metrics": {}
    }
   
    for metric in metrics_list:
        results_to_save["metrics"][metric.name] = {
            "score": metric.score,
            "threshold": metric.threshold,
            "passed": metric.score >= metric.threshold
        }

    results_to_save["test_cases"] = []
    for i, test_case in enumerate(dataset.test_cases):
        case_result = {
            "input": test_case.input,
            "actual_output": test_case.actual_output,
            "expected_output": test_case.expected_output,
            "metric_results": {}
        }
        
        for metric in metrics_list:
            if hasattr(metric, 'test_case_scores') and i < len(metric.test_case_scores):
                case_result["metric_results"][metric.name] = metric.test_case_scores[i]
        
        results_to_save["test_cases"].append(case_result)

    output_file = f"{model_name}_001_eval_score.json"
    with open(output_file, 'w', encoding='utf-8') as f:
        json.dump(results_to_save, f, indent=2)
    
    print(f"Evaluation results saved to {output_file}")
    return results_to_save

def main():
    ground_truth_file = "ground_truth_001.json"
    ground_truth_data = load_ground_truth(ground_truth_file)
    print(f"Loaded {len(ground_truth_data)} ground truth items")
 
    model_name = input("Enter the model name ")
    model_results_file = f"{model_name}_001_results.json"
    model_results = load_model_results(model_results_file)
    print(f"Loaded {len(model_results)} model outputs")
    test_cases = create_test_cases(ground_truth_data, model_results)
    print(f"Created {len(test_cases)} test cases")
    dataset = EvaluationDataset(test_cases=test_cases)
    
    metrics = [
        HallucinationMetric(threshold=0.3),
        AnswerRelevancyMetric(threshold=0.5),
        BiasMetric(threshold=0.5),
        ToxicityMetric(threshold=0.5),
        # FaithfulnessMetric(threshold=0.5),
    ]
    
    print(f"Starting evaluation for {model_name}...")
    results = evaluate_and_save(dataset, model_name, metrics)
    run_confident_evaluate = input("Run confident_evaluate for dashboard? (y/n): ").lower()
    if run_confident_evaluate == 'y':
        from deepeval import confident_evaluate
        confident_evaluate(metric_collection=f"{model_name} Evaluation", dataset=dataset, metrics=metrics)
    
    print("\nEvaluation Summary:")
    for metric_name, metric_data in results['metrics'].items():
        print(f"{metric_name}: {metric_data['score']} (Threshold: {metric_data['threshold']})")

if __name__ == "__main__":
    main()