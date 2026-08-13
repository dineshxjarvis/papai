export const initialDocument = `
<h1>1. Introduction</h1>

<p>
Recent advancements in deep learning have significantly improved image recognition performance across various medical domains.
<mark class="claim-yellow" id="claim-1">
Convolutional Neural Networks (CNNs) achieve higher accuracy than traditional machine learning algorithms in medical image classification.
</mark>
<sup class="claim-number yellow">1</sup>
</p>

<p>
Many researchers have explored different model architectures, pre-processing workflows, and clinical benchmark datasets to validate this claim under rigorous experimental conditions.
</p>

<p>
<mark class="claim-green" id="claim-2">
ResNet-50 outperforms VGG-16 on the ImageNet dataset with a top-1 accuracy of 76.3%.
</mark>
<sup class="claim-number green">2</sup>
</p>

<p>
<mark class="claim-red" id="claim-3">
However, some studies show that the performance improvement of CNNs is not statistically significant in small datasets.
</mark>
<sup class="claim-number red">3</sup>
</p>

<h1>2. Related Work & Experimental Findings</h1>

<p>
Several comparative evaluations have analyzed deep neural architectures against gradient boosted trees and support vector machines (SVMs). While CNNs generally achieve lower generalization error on large-scale datasets, their computational footprint remains substantial.
</p>

<blockquote>
"Deep network architectures require substantial data augmentation and regularized loss functions when deployed on scarce clinical datasets." — Journal of Medical AI (2024)
</blockquote>

<h1>3. Methodology & Performance Benchmarks</h1>

<p>
In this study, we evaluate the inference latency, sensitivity, and specificity of multiple deep learning models across public MRI and X-ray repositories using standard statistical evaluation metrics.
</p>
`;

export const editorConfig = {
  autofocus: "end",
  editable: true,
  injectCSS: false,
};
