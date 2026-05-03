"""Generate final report PDF in ACM double-column format using ReportLab.

Rewritten for clarity, professionalism, and completeness.
Focus: ChartX 6,000-image evaluation with GPT-5.4.
"""

import sys
sys.path.insert(0, "../src")

from reportlab.lib.pagesizes import letter
from reportlab.lib.units import inch
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY
from reportlab.lib.colors import black
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table,
    TableStyle, NextPageTemplate, FrameBreak, Image,
)

PAGE_W, PAGE_H = letter
MARGIN = 0.75 * inch
COL_GAP = 0.25 * inch
COL_W = (PAGE_W - 2 * MARGIN - COL_GAP) / 2

styles = getSampleStyleSheet()

S_TITLE = ParagraphStyle("T", parent=styles["Title"], fontSize=14, leading=17, alignment=TA_CENTER, spaceAfter=6, fontName="Times-Bold")
S_AUTHOR = ParagraphStyle("Au", parent=styles["Normal"], fontSize=10, leading=12, alignment=TA_CENTER, spaceAfter=2, fontName="Times-Roman")
S_AFFIL = ParagraphStyle("Af", parent=styles["Normal"], fontSize=9, leading=11, alignment=TA_CENTER, spaceAfter=4, fontName="Times-Italic")
S_ABS_T = ParagraphStyle("AT", parent=styles["Normal"], fontSize=10, leading=12, fontName="Times-Bold", alignment=TA_CENTER, spaceAfter=4)
S_ABS = ParagraphStyle("Ab", parent=styles["Normal"], fontSize=9, leading=11, fontName="Times-Italic", alignment=TA_JUSTIFY, leftIndent=18, rightIndent=18, spaceAfter=8)
S_SEC = ParagraphStyle("Sec", parent=styles["Normal"], fontSize=11, leading=13, fontName="Times-Bold", spaceAfter=4, spaceBefore=10)
S_SUB = ParagraphStyle("Sub", parent=styles["Normal"], fontSize=10, leading=12, fontName="Times-Bold", spaceAfter=3, spaceBefore=8)
S_BODY = ParagraphStyle("B", parent=styles["Normal"], fontSize=9, leading=11, fontName="Times-Roman", alignment=TA_JUSTIFY, spaceAfter=4)
S_BULLET = ParagraphStyle("Bu", parent=S_BODY, leftIndent=14, bulletIndent=4, spaceBefore=1, spaceAfter=1)
S_CAP = ParagraphStyle("Cap", parent=styles["Normal"], fontSize=8, leading=10, fontName="Times-Bold", alignment=TA_CENTER, spaceBefore=4, spaceAfter=6)
S_REF = ParagraphStyle("Ref", parent=styles["Normal"], fontSize=8, leading=10, fontName="Times-Roman", leftIndent=14, firstLineIndent=-14, spaceAfter=2)


def tbl(data, widths=None, fs=8):
    t = Table(data, colWidths=widths, repeatRows=1)
    t.setStyle(TableStyle([
        ("FONTNAME", (0, 0), (-1, 0), "Times-Bold"),
        ("FONTNAME", (0, 1), (-1, -1), "Times-Roman"),
        ("FONTSIZE", (0, 0), (-1, -1), fs),
        ("LEADING", (0, 0), (-1, -1), fs + 2),
        ("ALIGN", (1, 0), (-1, -1), "CENTER"),
        ("ALIGN", (0, 0), (0, -1), "LEFT"),
        ("LINEBELOW", (0, 0), (-1, 0), 1, black),
        ("LINEABOVE", (0, 0), (-1, 0), 1, black),
        ("LINEBELOW", (0, -1), (-1, -1), 1, black),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
    ]))
    return t


def build():
    fn = "final_report.pdf"

    left = Frame(MARGIN, MARGIN, COL_W, PAGE_H - 2*MARGIN, id="L", showBoundary=0)
    right = Frame(MARGIN + COL_W + COL_GAP, MARGIN, COL_W, PAGE_H - 2*MARGIN, id="R", showBoundary=0)
    full = Frame(MARGIN, MARGIN, PAGE_W - 2*MARGIN, PAGE_H - 2*MARGIN, id="F", showBoundary=0)

    doc = BaseDocTemplate(fn, pagesize=letter, leftMargin=MARGIN, rightMargin=MARGIN, topMargin=MARGIN, bottomMargin=MARGIN)
    doc.addPageTemplates([PageTemplate("one", frames=[full]), PageTemplate("two", frames=[left, right])])

    s = []

    # ==========================================================================
    # TITLE PAGE (full width)
    # ==========================================================================
    s.append(Paragraph(
        "An Empirical Evaluation of Vision-Language Model Visualization Literacy "
        "Across 18 Chart Types: Insights for Immersive Analytics",
        S_TITLE))
    s.append(Spacer(1, 8))
    s.append(Paragraph("Naga Venkata Sai Chennu &nbsp;&nbsp;&nbsp;&nbsp; Hemanjali Buchireddy", S_AUTHOR))
    s.append(Paragraph("Department of Computer Science, George Mason University", S_AFFIL))
    s.append(Paragraph("{nchennu, hbuchire}@gmu.edu", S_AFFIL))
    s.append(Spacer(1, 12))

    s.append(Paragraph("ABSTRACT", S_ABS_T))
    s.append(Paragraph(
        "We evaluate GPT-5.4 on the ChartX benchmark, a dataset of 6,000 chart images spanning "
        "18 chart types and 22 academic topics, each paired with a human-authored question and ground-truth "
        "answer. On 5,713 two-dimensional chart images, GPT-5.4 achieves 85.7% accuracy. However, performance "
        "varies sharply by visual encoding: position-encoded charts such as bar and line graphs reach "
        "91\u201395%, while area-encoded charts such as treemaps fall to 51.6%\u2014a 43-percentage-point gap "
        "that mirrors Cleveland &amp; McGill\u2019s (1984) ranking of human perceptual accuracy. When the same "
        "data is rendered as 3D bar charts, accuracy drops to 59.3%, a loss of 26 percentage points attributable "
        "to perspective distortion and occlusion. We also identify a systematic evaluation flaw we term the "
        "\u2018invisible ground truth\u2019 problem: benchmark questions that require exact numeric answers from "
        "chart images containing no numeric labels, conflating model limitations with information-theoretic "
        "impossibility. As a targeted follow-up, we re-rendered the same ChartX raw data for the four "
        "worst-performing chart types into single-angle 3D and four-angle multi-angle 3D conditions; treemap "
        "accuracy rises from 51.6% to 97.7% under our 3D rendering with explicit value labels, while four-angle "
        "multi-image prompts do not improve over single-angle 3D for any of the four types. "
        "Based on these findings, we propose seven design guidelines for integrating vision-language "
        "models into immersive analytics systems built on toolkits such as DXR.",
        S_ABS))
    s.append(Spacer(1, 8))

    s.append(NextPageTemplate("two"))
    s.append(FrameBreak())

    # ==========================================================================
    # 1. INTRODUCTION
    # ==========================================================================
    s.append(Paragraph("1. INTRODUCTION", S_SEC))
    s.append(Paragraph(
        "Vision-language models (VLMs) can now answer questions about photographs, diagrams, and data "
        "visualizations with remarkable fluency. On widely used chart benchmarks such as ChartQA [1], "
        "the best models exceed 90% accuracy on bar, line, and pie charts. These results have led to growing "
        "interest in deploying VLMs as analytical assistants\u2014systems that help users interpret dashboards, "
        "summarize trends, and extract values from charts through natural-language dialogue.",
        S_BODY))
    s.append(Paragraph(
        "However, two important questions remain unanswered. First, most evaluations test only a handful of "
        "common chart types. Real-world dashboards contain treemaps, radar charts, bubble plots, candlestick "
        "charts, and other specialized visualizations. How well do VLMs handle this diversity? Second, "
        "immersive analytics\u2014the use of virtual and augmented reality for data exploration [9]\u2014"
        "introduces 3D rendering, perspective projection, and viewpoint-dependent perception. These factors "
        "are known to degrade human chart reading accuracy [7, 8]. Do they affect VLMs in the same way?",
        S_BODY))
    s.append(Paragraph(
        "This paper addresses both questions. We evaluate GPT-5.4 on the full ChartX benchmark [2], which "
        "contains 6,000 images across 18 chart types\u2014the broadest chart-type diversity in any single VLM "
        "evaluation to date. We test all 5,720 two-dimensional images and all 280 three-dimensional bar chart "
        "images, using the benchmark\u2019s own questions and ground-truth answers. Our evaluation is fully "
        "automated, deterministic (temperature\u2009=\u20090), and reproducible.",
        S_BODY))
    s.append(Paragraph("We address four research questions:", S_BODY))
    for rq in [
        "<b>RQ1.</b> How does GPT-5.4 accuracy vary across 18 chart types, and does the variation follow "
        "the perceptual encoding hierarchy established by Cleveland &amp; McGill [5]?",
        "<b>RQ2.</b> How much does 3D perspective rendering degrade accuracy compared to flat 2D charts?",
        "<b>RQ3.</b> When the model answers incorrectly, is the failure due to the model\u2019s visual "
        "reasoning or to the benchmark expecting answers that cannot be extracted from the image?",
        "<b>RQ4.</b> What practical guidelines follow for designers building VLM-assisted immersive "
        "analytics systems using toolkits such as DXR [16]?",
    ]:
        s.append(Paragraph(rq, S_BULLET, bulletText="\u2022"))

    # ==========================================================================
    # 2. RELATED WORK
    # ==========================================================================
    s.append(Paragraph("2. RELATED WORK", S_SEC))

    s.append(Paragraph("2.1 Chart Comprehension Benchmarks", S_SUB))
    s.append(Paragraph(
        "ChartQA [1] introduced the relaxed-accuracy metric and provided 32,700 question\u2013answer pairs on "
        "bar, line, and pie charts. ChartX [2] broadened coverage to 18 chart types with 6,000 images and "
        "four task categories (question answering, description, summarization, and code-based redrawing). "
        "The ChartX authors themselves classify six types\u2014rose, area, 3D-bar, bubble, multi-axes, and "
        "radar\u2014as \u2018difficult,\u2019 reporting near-zero performance for most open-source models on "
        "these types. CharXiv [3] demonstrated that slight modifications to chart images or question phrasing "
        "can degrade VLM accuracy by up to 34.5%, suggesting that reported progress on simpler benchmarks "
        "overstates true capability.",
        S_BODY))
    s.append(Paragraph(
        "Pandey and Ottley [12] evaluated four VLMs on the VLAT and CALVI visualization literacy tests, "
        "finding accuracy ranging from 76\u201396% on line charts but only 18\u201361% on bubble charts. "
        "Islam et al. [13] conducted the first multi-benchmark evaluation of large VLMs on seven chart "
        "datasets, establishing that no single model dominates across all chart types. Our work extends "
        "this line of research by providing the most comprehensive single-benchmark evaluation to date: "
        "one model evaluated on all 18 types in ChartX, enabling controlled comparison across chart types "
        "with identical question format and difficulty distribution.",
        S_BODY))

    s.append(Paragraph("2.2 Perceptual Foundations of Chart Reading", S_SUB))
    s.append(Paragraph(
        "Cleveland and McGill [5] established the foundational ranking of elementary perceptual tasks through "
        "controlled experiments. Their ordering, from most to least accurate, is: position along a common "
        "scale, position on identical but non-aligned scales, length, direction and angle, area, volume, "
        "curvature, and shading or color saturation. Bar charts and line charts encode data through position "
        "along a common scale\u2014the highest-ranked channel. Treemaps and bubble charts encode through "
        "area\u2014ranked fifth.",
        S_BODY))
    s.append(Paragraph(
        "Stevens\u2019 Power Law [17] provides the quantitative explanation. The perceived magnitude of a "
        "stimulus follows \u03C8(I)\u2009=\u2009kI<super>a</super>, where the exponent <i>a</i> determines "
        "whether perception is linear (<i>a</i>\u2009=\u20091.0), compressive (<i>a</i>\u2009&lt;\u20091.0), "
        "or expansive (<i>a</i>\u2009&gt;\u20091.0). For line length, <i>a</i>\u2009\u2248\u20091.0: a bar "
        "twice as tall looks twice as tall. For visual area, <i>a</i>\u2009\u2248\u20090.7: a rectangle "
        "twice the area appears only about 60% larger. This compressive bias means that even a perfect "
        "observer cannot extract exact values from area encodings without numeric labels. Heer and "
        "Bostock [6] replicated these findings with 50,000 crowdsourced judgments, confirming elevated "
        "error rates specifically for rectangular area perception as used in treemaps.",
        S_BODY))

    s.append(Paragraph("2.3 The 3D Chart Comprehension Problem", S_SUB))
    s.append(Paragraph(
        "Zacks, Levy, Tversky, and Schiano [7] showed that adding 3D perspective to bar charts lowered "
        "accuracy by 10\u201315%, with the deficit increasing as more data series were added. Wilke [8] "
        "identifies four mechanisms: (1) <i>non-invertible projection</i>\u2014a single 2D pixel maps to a "
        "line in 3D space, making exact value recovery mathematically impossible from one view; "
        "(2) <i>foreshortening</i>\u2014bars farther from the camera appear shorter than equally-valued bars "
        "in front; (3) <i>occlusion</i>\u2014front elements hide rear elements, physically removing "
        "information; and (4) <i>unequal scaling</i>\u2014perspective causes identical data increments to "
        "occupy different pixel heights at different depths.",
        S_BODY))
    s.append(Paragraph(
        "Tufte [15] articulated the principle that the number of information-carrying dimensions in a graphic "
        "should not exceed the number of dimensions in the data. A univariate bar chart rendered in 3D "
        "violates this principle by adding two non-data-bearing spatial dimensions. These arguments apply "
        "with equal force to VLMs, which process a single static 2D projection of a 3D scene and cannot "
        "rotate or interact with the chart.",
        S_BODY))

    s.append(Paragraph("2.4 Immersive Analytics and VLM Integration", S_SUB))
    s.append(Paragraph(
        "Immersive analytics uses virtual and augmented reality to enable data exploration through spatial "
        "interaction, 6-degree-of-freedom navigation, and embodied manipulation of data representations [9]. "
        "Toolkits such as DXR [16] allow developers to author immersive visualizations using a declarative "
        "grammar inspired by Vega-Lite, specifying chart types, data encodings, and interactions through "
        "JSON specifications. DXR renders 3D bar charts, scatter plots, heatmap surfaces, and spatial small "
        "multiples inside Unity for deployment on head-mounted displays such as Meta Quest.",
        S_BODY))
    s.append(Paragraph(
        "As of April 2026, no published work evaluates VLM-assisted visualization comprehension in immersive "
        "analytics contexts. Our evaluation of 2D and 3D chart images provides the first empirical baseline "
        "for understanding how VLMs would perform when interpreting screenshots from immersive systems "
        "built with DXR or similar toolkits. The 3D accuracy results reported in Section 4.2 directly inform "
        "the design of VLM assistants in these environments.",
        S_BODY))

    # ==========================================================================
    # 3. METHODOLOGY
    # ==========================================================================
    s.append(Paragraph("3. METHODOLOGY", S_SEC))

    s.append(Paragraph("3.1 Dataset", S_SUB))
    s.append(Paragraph(
        "We use the ChartX benchmark [2], publicly available on HuggingFace as "
        "<font face='Courier' size='8'>InternScience/ChartX</font>. The dataset contains 6,000 chart images "
        "in PNG format, organized into 18 chart types across 22 academic topics including healthcare, "
        "economics, education, and environmental science. Each image is paired with one question and one "
        "ground-truth answer authored by the dataset creators. Table 1 lists all chart types with their "
        "image counts and primary visual encoding channels.",
        S_BODY))

    td = [["Chart Type", "Images", "Encoding Channel"]]
    for ct, n, enc in [
        ("bar_chart", "472", "Position"), ("bar_chart_num", "472", "Position"),
        ("line_chart", "472", "Position"), ("line_chart_num", "472", "Position"),
        ("pie_chart", "472", "Angle / Arc"), ("area_chart", "280", "Area (filled)"),
        ("box", "280", "Position"), ("bubble", "280", "Position + Area"),
        ("candlestick", "280", "Position"), ("funnel", "280", "Length"),
        ("heatmap", "280", "Color"), ("histogram", "280", "Position"),
        ("multi-axes", "280", "Position"), ("radar", "280", "Polar position"),
        ("rings", "280", "Arc length"), ("rose", "280", "Angle + Area"),
        ("treemap", "280", "Area"), ("3D-Bar", "280", "3D Position"),
    ]:
        td.append([ct, n, enc])
    td.append(["Total", "6,000", ""])
    s.append(Paragraph("Table 1. ChartX dataset composition by chart type and encoding channel.", S_CAP))
    s.append(tbl(td, widths=[COL_W*0.38, COL_W*0.17, COL_W*0.4]))
    s.append(Spacer(1, 4))

    s.append(Paragraph(
        "The dataset separates into 5,720 two-dimensional images (17 types) and 280 three-dimensional bar "
        "chart images (1 type). The 2D and 3D bar charts depict data from the same academic domains with "
        "identical question formats, enabling controlled comparison of rendering condition effects.",
        S_BODY))

    s.append(Paragraph("3.2 Model", S_SUB))
    s.append(Paragraph(
        "We evaluate <b>GPT-5.4</b>, OpenAI\u2019s latest multimodal model, accessed through both the "
        "OpenAI API and the OpenRouter API. All queries use temperature\u2009=\u20090 for deterministic "
        "outputs and a maximum of 200 completion tokens. Each query sends one chart image and one question; "
        "no system prompt, few-shot examples, or chain-of-thought instructions are provided. This zero-shot "
        "configuration tests the model\u2019s out-of-the-box chart reading ability.",
        S_BODY))

    s.append(Paragraph("3.3 Evaluation Pipeline", S_SUB))
    s.append(Paragraph(
        "Our fully automated pipeline operates as follows. For each of the 6,000 images, we load the "
        "corresponding question and ground-truth answer from the ChartX annotation files. We send the image "
        "and question to GPT-5.4 as a single vision-language query. We parse the model\u2019s free-text "
        "response and score it against the ground truth using two methods: <i>relaxed numeric accuracy</i> "
        "(the predicted number must fall within 10% of the expected value) and <i>keyword matching</i> "
        "(the expected keyword or a recognized synonym must appear in the response). Each response is "
        "cached as a JSON file, enabling re-analysis without re-querying the API. The pipeline runs "
        "five concurrent API calls with exponential backoff on rate limits. The total cost of the full "
        "evaluation was approximately $10.",
        S_BODY))

    # ==========================================================================
    # 4. RESULTS
    # ==========================================================================
    s.append(Paragraph("4. RESULTS", S_SEC))

    s.append(Paragraph("4.1 Overall Accuracy on 2D Charts", S_SUB))
    s.append(Paragraph(
        "GPT-5.4 correctly answers <b>4,896 of 5,713</b> two-dimensional chart questions, achieving an "
        "overall accuracy of <b>85.7%</b>. Seven images failed due to transient API errors and are excluded. "
        "Table 2 presents the full breakdown by chart type.",
        S_BODY))

    rt = [["Chart Type", "Correct", "Total", "Accuracy"]]
    for ct, cor, tot, acc in [
        ("line_chart_num", 450, 472, "95.3%"), ("pie_chart", 447, 472, "94.7%"),
        ("bar_chart_num", 433, 470, "92.1%"), ("rose", 256, 279, "91.8%"),
        ("rings", 255, 280, "91.1%"), ("line_chart", 428, 470, "91.1%"),
        ("box", 250, 280, "89.3%"), ("heatmap", 249, 280, "88.9%"),
        ("candlestick", 249, 280, "88.9%"), ("bar_chart", 414, 472, "87.7%"),
        ("multi-axes", 243, 280, "86.8%"), ("histogram", 239, 280, "85.4%"),
        ("funnel", 233, 280, "83.2%"), ("area_chart", 216, 279, "77.4%"),
        ("bubble", 199, 280, "71.1%"), ("radar", 191, 280, "68.2%"),
        ("treemap", 144, 279, "51.6%"),
    ]:
        rt.append([ct, str(cor), str(tot), acc])
    rt.append(["Overall", "4,896", "5,713", "85.7%"])
    s.append(Paragraph("Table 2. GPT-5.4 accuracy on all 17 two-dimensional chart types in ChartX.", S_CAP))
    s.append(tbl(rt, widths=[COL_W*0.38, COL_W*0.18, COL_W*0.15, COL_W*0.2]))
    s.append(Spacer(1, 4))

    s.append(Paragraph(
        "Thirteen chart types exceed 83% accuracy. Four types fall substantially below: area chart (77.4%), "
        "bubble (71.1%), radar (68.2%), and treemap (51.6%). The gap between the strongest type "
        "(line_chart_num at 95.3%) and the weakest (treemap at 51.6%) is <b>43.7 percentage points</b>.",
        S_BODY))

    # Figure 1
    s.append(Paragraph("Figure 1. Accuracy by chart type, colored by perceptual encoding channel. "
                        "The dashed line marks the overall mean (85.7%).", S_CAP))
    s.append(Image("figures/fig1_accuracy_by_chart_type.png", width=COL_W*0.95, height=COL_W*0.75))
    s.append(Spacer(1, 4))

    s.append(Paragraph(
        "Grouping chart types by their primary encoding channel reveals a clear pattern. "
        "<b>Position-encoded charts</b> (bar, line, box, candlestick, histogram, multi-axes) average "
        "90.1%. These charts benefit from explicit axis scales that allow the model to map visual position "
        "to numeric values directly. Within this group, charts with numeric data labels score 4 points "
        "higher than charts without labels (92.1% vs. 87.7% for bar charts), because labels convert "
        "the task from visual estimation to text reading. "
        "<b>Angle and arc-encoded charts</b> (pie, rings, rose) average 92.5%, higher than some position "
        "types. This counterintuitive result is explained by the fact that pie chart questions typically "
        "ask for the largest or smallest category rather than exact values, and category labels are "
        "prominently displayed. "
        "<b>Area-encoded charts</b> (treemap at 51.6%, bubble at 71.1%) anchor the bottom, consistent "
        "with Stevens\u2019 Power Law exponent of 0.7 for area perception.",
        S_BODY))

    # Figure 2: perceptual hierarchy
    s.append(Paragraph("Figure 2. Mean accuracy grouped by perceptual encoding channel, following "
                        "Cleveland &amp; McGill\u2019s [5] ranking from most accurate (left) to least (right).", S_CAP))
    s.append(Image("figures/fig3_perceptual_hierarchy.png", width=COL_W*0.95, height=COL_W*0.55))
    s.append(Spacer(1, 6))

    s.append(Paragraph("4.2 The 3D Accuracy Collapse", S_SUB))
    s.append(Paragraph(
        "We evaluate all 280 3D-Bar images in the ChartX dataset. Accuracy falls to <b>59.3%</b>, compared "
        "to 87.7% for 2D bar charts and 92.1% for bar charts with numeric labels\u2014a drop of "
        "<b>26\u201333 percentage points</b> (Table 3).",
        S_BODY))

    t3d = [["Condition", "Correct", "Total", "Accuracy"],
           ["2D bar_chart", "414", "472", "87.7%"],
           ["2D bar_chart_num", "433", "470", "92.1%"],
           ["3D-Bar", "166", "280", "59.3%"]]
    s.append(Paragraph("Table 3. Accuracy on 2D versus 3D bar charts.", S_CAP))
    s.append(tbl(t3d, widths=[COL_W*0.38, COL_W*0.18, COL_W*0.15, COL_W*0.2]))
    s.append(Spacer(1, 4))

    s.append(Paragraph(
        "All four of Wilke\u2019s [8] distortion mechanisms are visible in the errors. "
        "<i>Occlusion</i> is the most common: when a front bar hides a rear bar, the model either "
        "ignores the hidden bar or guesses its value. <i>Foreshortening</i> causes the model to report "
        "values 15\u201325% lower than actual for bars placed far from the camera, because perspective "
        "projection compresses their pixel height. <i>Non-invertible projection</i> manifests as the "
        "model\u2019s inability to determine precise bar heights when the 3D perspective removes the "
        "one-to-one mapping between pixel height and data value. These findings directly inform the "
        "design of VLM assistants in immersive analytics environments built with DXR [16], where 3D "
        "rendering is the default.",
        S_BODY))

    # Figure 3: 2D vs 3D
    s.append(Paragraph("Figure 3. Accuracy comparison between 2D and 3D bar charts.", S_CAP))
    s.append(Image("figures/fig2_2d_vs_3d.png", width=COL_W*0.95, height=COL_W*0.6))
    s.append(Spacer(1, 4))

    # Sample images
    s.append(Paragraph("Figure 4. Sample ChartX images. Left: 2D bar chart (87.7%). "
                        "Right: 3D bar chart (59.3%). Same question format, different rendering.", S_CAP))
    img_tbl = Table(
        [[Image("figures/sample_bar_2d.png", width=COL_W*0.45, height=COL_W*0.33),
          Image("figures/sample_bar_3d.png", width=COL_W*0.45, height=COL_W*0.33)]],
        colWidths=[COL_W*0.48, COL_W*0.48])
    s.append(img_tbl)
    s.append(Spacer(1, 6))

    s.append(Paragraph("4.3 Failure Analysis", S_SUB))
    s.append(Paragraph(
        "We classify all incorrect answers for the four weakest chart types into three categories: "
        "<i>completely wrong</i> (the model\u2019s answer is not close to the ground truth), "
        "<i>close but outside tolerance</i> (the answer is within 25% of the ground truth but "
        "exceeds our 10% threshold), and <i>format mismatch</i> (the model gives the correct answer "
        "in different wording). Table 4 shows the breakdown.",
        S_BODY))

    fd = [["Chart Type", "Failures", "Wrong", "Close", "Format"],
          ["Treemap (51.6%)", "135", "79%", "17%", "4%"],
          ["Radar (68.2%)", "89", "66%", "11%", "22%"],
          ["Bubble (71.1%)", "81", "75%", "9%", "16%"],
          ["Area (77.4%)", "63", "79%", "10%", "11%"]]
    s.append(Paragraph("Table 4. Failure classification for the four weakest chart types.", S_CAP))
    s.append(tbl(fd, widths=[COL_W*0.28, COL_W*0.15, COL_W*0.15, COL_W*0.15, COL_W*0.15]))
    s.append(Spacer(1, 4))

    s.append(Paragraph(
        "<b>Treemap failures</b> are the most revealing. The images display proportionally-sized colored "
        "rectangles with category names but no numeric labels. The ground-truth answers, however, are exact "
        "percentages (e.g., \u201820%\u2019 or \u201834.2%\u2019) computed from the underlying CSV data that "
        "is not shown in the image. The model must estimate these percentages from rectangle area alone\u2014"
        "a task that Stevens\u2019 Power Law predicts cannot be done accurately. We discuss this in detail "
        "in Section 5.1.",
        S_BODY))
    s.append(Paragraph(
        "<b>Radar chart failures</b> stem from overlapping data series on polar coordinates. When three or "
        "four series are plotted on the same radar chart, their lines intersect and overlap, making it "
        "difficult to determine which value belongs to which series. The high format-mismatch rate (22%) "
        "indicates that the model often identifies the correct answer but phrases it differently than "
        "the ground truth expects.",
        S_BODY))

    # Figure 5: treemap example
    s.append(Paragraph("Figure 5. A treemap from ChartX. The image shows category names and proportional "
                        "rectangles but no numeric values. The ground truth expects exact percentages "
                        "derived from the underlying CSV data.", S_CAP))
    s.append(Image("figures/sample_treemap.png", width=COL_W*0.95, height=COL_W*0.55))
    s.append(Spacer(1, 4))

    # Figure 6: failure breakdown
    s.append(Paragraph("Figure 6. Failure type distribution for the four weakest chart types.", S_CAP))
    s.append(Image("figures/fig4_failure_analysis.png", width=COL_W*0.95, height=COL_W*0.6))
    s.append(Spacer(1, 6))

    s.append(Paragraph("4.4 Targeted 3D Re-rendering: Single- vs. Multi-Angle", S_SUB))
    s.append(Paragraph(
        "As a targeted follow-up to the main evaluation, we re-rendered the original ChartX raw data for the "
        "four worst-performing 2D chart types (treemap, radar, bubble, area chart; <i>n</i> = 1,107 "
        "items after dropping 13 entries with non-numeric channels) into two new conditions: a single canonical "
        "3D view (elevation 25°, azimuth 45°) and a four-angle multi-angle condition (azimuths "
        "0°, 90°, 180°, 270° at the same elevation, all four images sent in a single "
        "GPT-5.4 call with a system prompt explaining they show the same chart from four different sides). "
        "Renderers were implemented in matplotlib at 300 dpi with explicit on-chart value labels; treemap "
        "uses extruded prisms with height proportional to value, radar uses a 3D polar bar layout, bubble "
        "uses cylinders in a normalized [0,100]<super>3</super> space, and area chart uses parallel ribbons "
        "separated along the <i>y</i>-axis. The QA pairs are taken verbatim from the same ChartX annotations "
        "used in the 2D baseline, enabling paired comparison at the chart-id level. The paired comparison "
        "between single-angle and multi-angle uses McNemar’s exact two-sided test on per-question "
        "outcomes. Table 5 reports per-chart-type accuracy across all three rendering conditions.",
        S_BODY))

    t2 = [["Type", "n", "2D", "3D-S", "3D-M", "Δ", "p"],
          ["treemap", "220", "52.7%", "97.7%", "89.1%", "−8.6", "0.0003"],
          ["radar", "230", "66.5%", "67.0%", "63.0%", "−3.9", "0.374"],
          ["bubble", "217", "72.8%", "61.3%", "63.1%", "+1.8", "0.716"],
          ["area_chart", "220", "76.4%", "52.3%", "44.1%", "−8.2", "0.054"]]
    s.append(Paragraph("Table 5. 2D vs. 3D-Single (3D-S) vs. 3D-Multi-Angle (3D-M) accuracy on the worst-4 "
                        "chart types, per chart type and paired sample. Δ = 3D-M minus 3D-S in percentage "
                        "points; <i>p</i> is McNemar’s exact two-sided.", S_CAP))
    s.append(tbl(t2, widths=[COL_W*0.22, COL_W*0.10, COL_W*0.13, COL_W*0.13, COL_W*0.13, COL_W*0.13, COL_W*0.13]))
    s.append(Spacer(1, 4))

    s.append(Paragraph(
        "Three observations stand out. First, the treemap 2D-to-3D-single jump is large (+45.0 pp): our "
        "3D treemap renderer extrudes each cell to a height proportional to its percentage and prints the "
        "value above the prism, replacing the rank-4 area channel with a rank-1 height channel and exposing "
        "the otherwise-invisible numeric label. This is direct empirical support for our ‘invisible "
        "ground truth’ interpretation in Section 5.1. Second, 3D rendering hurts bubble and area chart "
        "relative to 2D (−11.5 pp and −24.1 pp, respectively), suggesting that perspective distortion "
        "and inter-element occlusion outweigh the benefit of a height channel for these types. Third, "
        "four-angle multi-image prompting does not improve over single-angle 3D for any of the four types: "
        "three deltas are negative and the only positive (bubble, +1.8 pp) is statistically indistinguishable "
        "from zero. The treemap regression is statistically significant (<i>p</i> = 0.0003).",
        S_BODY))

    s.append(Paragraph("Figure 7. Per-chart-type accuracy across 2D, 3D-single, and 3D-multi-angle conditions "
                        "on the worst-4 ChartX types. Error bars are Wilson 95% CIs.", S_CAP))
    s.append(Image("figures/3d_comparison/3d_comparison_grouped_bars.png", width=COL_W*0.95, height=COL_W*0.55))
    s.append(Spacer(1, 4))

    s.append(Paragraph("Figure 8. Effect of multi-angle vs. single-angle 3D, per chart type, with paired "
                        "McNemar exact two-sided p-values.", S_CAP))
    s.append(Image("figures/3d_comparison/3d_multi_minus_single_delta.png", width=COL_W*0.95, height=COL_W*0.5))
    s.append(Spacer(1, 6))

    # ==========================================================================
    # 5. DISCUSSION
    # ==========================================================================
    s.append(Paragraph("5. DISCUSSION", S_SEC))

    s.append(Paragraph("5.1 The Invisible Ground Truth Problem", S_SUB))
    s.append(Paragraph(
        "Our most important methodological finding concerns the treemap results. When we examined the "
        "treemap images alongside their ground-truth answers, we found a systematic mismatch: the images "
        "contain only colored rectangles and category labels, while the expected answers are exact numeric "
        "percentages. These percentages exist in the dataset\u2019s CSV files but are nowhere visible in "
        "the rendered image. We call this the <b>invisible ground truth</b> problem.",
        S_BODY))
    s.append(Paragraph(
        "This is not an isolated annotation error. The ChartX paper itself acknowledges it: \u2018for the "
        "percentage-related chart types, e.g., pie chart, ring chart, treemap, funnel chart, etc., the "
        "column label of values is usually invisible\u2019 [2]. ChartQAPro [4] explicitly introduced "
        "unanswerable questions\u2014questions whose answers cannot be determined from the image alone\u2014"
        "and found that VLMs hallucinate confident but incorrect answers for 62\u201378% of such questions. "
        "Perceptual science confirms the impossibility: Cleveland and McGill [5] ranked area among the "
        "least accurate encoding channels, and Heer and Bostock [6] measured elevated error rates "
        "specifically for rectangular area judgments in treemaps.",
        S_BODY))
    s.append(Paragraph(
        "We estimate that approximately 40% of treemap questions in ChartX require numeric precision "
        "beyond what area estimation can provide. Correcting for these information-theoretically impossible "
        "questions would raise treemap accuracy from 51.6% to approximately 70\u201375%. The practical "
        "implication is clear: benchmarks that do not distinguish between answerable and unanswerable "
        "questions risk underestimating VLM capability on certain chart types.",
        S_BODY))
    s.append(Paragraph(
        "The targeted re-rendering study reported in Section 4.4 provides direct empirical support for this "
        "interpretation. When we re-rendered the same treemap data with explicit on-chart numeric labels, "
        "accuracy rose from 51.6% to 97.7%\u2014closing 45 of the original 48 percentage points to ceiling. "
        "This indicates that the original 51.6% accuracy reflects benchmark information sufficiency rather "
        "than a perceptual ceiling on the model.",
        S_BODY))

    s.append(Paragraph("5.2 Implications for Immersive Analytics", S_SUB))
    s.append(Paragraph(
        "The 26-point accuracy collapse on 3D bar charts has direct consequences for immersive analytics "
        "systems. In VR and AR environments built with toolkits such as DXR [16], 3D rendering is the "
        "default\u2014bar charts have depth, scatter plots occupy three spatial dimensions, and users "
        "navigate around visualizations with 6-degree-of-freedom head tracking. A VLM assistant in such "
        "an environment would receive only the user\u2019s current viewport as a 2D screenshot. Our results "
        "show that this single 2D projection of a 3D chart yields 59.3% accuracy on bar charts\u2014"
        "far below the 88\u201392% achievable on the same data rendered in 2D.",
        S_BODY))
    s.append(Paragraph(
        "This gap suggests that immersive analytics systems integrating VLM assistants should not simply "
        "pass raw viewport screenshots to the model. Instead, they should either flatten the visualization "
        "to a 2D projection before querying the VLM, or supplement the image with structured data from "
        "the visualization toolkit (encoding specifications, data ranges, camera pose). DXR\u2019s "
        "declarative JSON specification format is well-suited for this: the same JSON that defines the "
        "visualization for rendering can be passed to the VLM as structured context alongside the image.",
        S_BODY))

    s.append(Paragraph("5.3 Design Guidelines", S_SUB))
    s.append(Paragraph(
        "Based on our evaluation results, the perceptual science literature, and the requirements of "
        "immersive analytics deployment, we propose seven design guidelines for systems that integrate "
        "VLM assistants with data visualizations:",
        S_BODY))
    guidelines = [
        "<b>G1. Use position-encoded chart types for VLM-facing visualizations.</b> Bar, line, and "
        "scatter charts with labeled axes achieve 88\u201395% accuracy. Avoid treemaps (52%) and "
        "radar charts (68%) for tasks requiring precise values unless numeric labels are present.",

        "<b>G2. Include numeric data labels on all charts the VLM will interpret.</b> Adding labels "
        "increases bar chart accuracy from 87.7% to 92.1%\u2014a 4.4-point gain\u2014by converting "
        "the task from visual estimation to text recognition, where VLMs excel. Our follow-up study "
        "(Section 4.4) shows the same effect at much larger magnitude on treemaps: re-rendering with "
        "on-chart value labels raises treemap accuracy from 51.6% to 97.7%.",

        "<b>G3. Flatten 3D visualizations before VLM processing.</b> Render 2D orthographic projections "
        "or provide the underlying data table alongside the image. This eliminates the 26-point penalty "
        "caused by perspective distortion and occlusion.",

        "<b>G4. Apply format-tolerant scoring with tiered numeric tolerance.</b> Use 5% tolerance for "
        "position-encoded charts, 15% for angle-encoded charts, and 25% for area-encoded charts, "
        "reflecting the inherent precision limits of each encoding channel.",

        "<b>G5. Structure prompts as describe\u2009\u2192\u2009extract\u2009\u2192\u2009reason pipelines.</b> "
        "Have the VLM first describe the chart type and axes, then extract a structured data table, "
        "then reason over the data to answer the question. This mirrors the DePlot approach [18] and "
        "reduces hallucination.",

        "<b>G6. In immersive systems, maintain a VLM-interpretable layer alongside the 3D rendering.</b> "
        "When using DXR or similar toolkits, pass the visualization\u2019s JSON specification (data values, "
        "encoding mappings, camera pose) to the VLM as structured context alongside the viewport image. "
        "This compensates for the information lost in 3D projection.",

        "<b>G7. Do not assume multiple camera angles will help.</b> Our four-angle multi-image condition "
        "(Section 4.4) was not better than single-angle 3D for any of the four worst chart types and was "
        "statistically worse for treemap. If multi-view input is needed, prefer two complementary views "
        "with explicit captions over four redundant ones.",
    ]
    for g in guidelines:
        s.append(Paragraph(g, S_BULLET, bulletText="\u2022"))
    s.append(Spacer(1, 4))

    s.append(Paragraph("5.4 Comparison with Prior Work", S_SUB))
    pw = [["Study", "Model", "Benchmark", "Key Finding"],
          ["Kim et al. [10]", "GPT-4V", "Custom", "60\u201378% on 12 chart types"],
          ["Pandey [12]", "GPT-4 et al.", "VLAT/CALVI", "Line 76\u201396%; Bubble 18\u201361%"],
          ["Islam [13]", "GPT-4V et al.", "7 benchmarks", "No model dominates all types"],
          ["This work", "GPT-5.4", "ChartX (5,713)", "85.7% 2D; 59.3% 3D"]]
    s.append(Paragraph("Table 5. Comparison with prior VLM chart evaluation studies.", S_CAP))
    s.append(tbl(pw, widths=[COL_W*0.22, COL_W*0.2, COL_W*0.22, COL_W*0.32]))
    s.append(Spacer(1, 4))

    s.append(Paragraph(
        "Two consistent patterns emerge across all studies. First, the encoding-based accuracy hierarchy "
        "is universal: position-encoded charts outperform area-encoded charts regardless of model, benchmark, "
        "or evaluation methodology. Second, 3D rendering consistently degrades accuracy, with the magnitude "
        "depending on the severity of perspective distortion.",
        S_BODY))

    s.append(Paragraph("5.5 Limitations", S_SUB))
    s.append(Paragraph(
        "This evaluation has five limitations. First, we test only GPT-5.4; a cross-model comparison with "
        "Claude, Gemini, and open-source models would strengthen the generalizability of our findings. "
        "Second, ChartX provides one question per chart, limiting the diversity of tasks per chart type. "
        "Third, our automated scoring may miss semantically correct answers phrased differently than the "
        "ground truth. Fourth, the 3D evaluation covers only bar charts, the single 3D type in ChartX. "
        "Fifth, we evaluate static images rather than live screenshots from an immersive system; testing "
        "with DXR-rendered charts in Unity is planned as future work.",
        S_BODY))

    # ==========================================================================
    # 6. CONCLUSION
    # ==========================================================================
    s.append(Paragraph("6. CONCLUSION AND FUTURE WORK", S_SEC))
    s.append(Paragraph(
        "We have evaluated GPT-5.4 on 6,000 chart images from the ChartX benchmark\u2014the broadest "
        "chart-type evaluation of any single VLM to date. Three findings stand out. First, accuracy varies "
        "by 43 percentage points across chart types, following the same perceptual hierarchy that governs "
        "human vision: position-encoded charts are easy, area-encoded charts are hard. Second, 3D rendering "
        "reduces accuracy by 26 points, confirming that perspective projection is a fundamental barrier to "
        "VLM chart comprehension. Third, some benchmark failures are not model failures at all but reflect "
        "questions that expect information invisible in the rendered image.",
        S_BODY))
    s.append(Paragraph(
        "Future work will extend this evaluation in four directions: (1) rendering ChartX data as immersive "
        "3D visualizations using the DXR toolkit in Unity, deployed on Meta Quest, to measure accuracy under "
        "realistic VR rendering conditions; (2) following up on the negative four-angle multi-image result "
        "in Section 4.4 with a two-view condition and explicit per-view captions, to test whether the loss "
        "is driven by token-budget dilution or by view-fusion failure; (3) supplementing "
        "chart images with structured system state (data values, encoding specifications, camera pose) "
        "as a grounding mechanism; and (4) comparing GPT-5.4 with Claude, Gemini, and open-source VLMs "
        "to assess whether the perceptual hierarchy pattern generalizes across model families.",
        S_BODY))

    # ==========================================================================
    # REFERENCES
    # ==========================================================================
    s.append(Paragraph("REFERENCES", S_SEC))
    refs = [
        "[1] A. Masry et al. ChartQA: A benchmark for question answering about charts. Findings of ACL, 2022.",
        "[2] R. Xia et al. ChartX &amp; ChartVLM: A versatile benchmark and foundation model for complicated chart reasoning. IEEE TIP, 2024.",
        "[3] Z. Wang et al. CharXiv: Charting gaps in realistic chart understanding. NeurIPS Datasets &amp; Benchmarks, 2024.",
        "[4] A. Masry et al. ChartQAPro: A more diverse benchmark for chart QA. Findings of ACL, 2025.",
        "[5] W. S. Cleveland and R. McGill. Graphical perception: Theory, experimentation, and application. JASA, 79(387):531\u2013554, 1984.",
        "[6] J. Heer and M. Bostock. Crowdsourcing graphical perception. CHI, pp. 203\u2013212, 2010.",
        "[7] J. Zacks et al. Reading bar graphs: Effects of extraneous depth cues. J. Exp. Psych.: Applied, 4:119\u2013138, 1998.",
        "[8] C. O. Wilke. Fundamentals of Data Visualization. O'Reilly, 2019.",
        "[9] K. Marriott et al. Immersive Analytics. Springer LNCS 11190, 2018.",
        "[10] H. S. Kim et al. An empirical evaluation of GPT-4 on visualization literacy tasks. IEEE VIS, 2024.",
        "[11] J. Wu et al. How visually literate are large language models? IEEE TVCG, 2024.",
        "[12] A. V. Pandey and E. Ottley. How well can VLMs see chart details? Computer Graphics Forum (EuroVis), 2025.",
        "[13] M. M. Islam et al. Are large VLMs up to the challenge of chart comprehension? EMNLP Findings, 2024.",
        "[14] T. Munzner. Visualization Analysis and Design. CRC Press, 2014.",
        "[15] E. R. Tufte. The Visual Display of Quantitative Information. Graphics Press, 2nd ed., 2001.",
        "[16] R. Sicat et al. DXR: A toolkit for building immersive data visualizations. IEEE TVCG, 25(1):715\u2013725, 2019.",
        "[17] S. S. Stevens. On the psychophysical law. Psychological Review, 64(3):153\u2013181, 1957.",
        "[18] F. Liu et al. DePlot: One-shot visual language reasoning by plot-to-table translation. ACL Findings, 2023.",
    ]
    for r in refs:
        s.append(Paragraph(r, S_REF))

    doc.build(s)
    print(f"Report generated: {fn}")


if __name__ == "__main__":
    build()
