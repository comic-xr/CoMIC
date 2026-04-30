declare module '@kitware/vtk.js/Filters/General/ImageMarchingCubes' {
  export interface vtkImageMarchingCubes {
    setInputData(data: unknown): void;
    setContourValue(value: number): void;
    update(): void;
    getOutputPort(): unknown;
    delete?(): void;
  }

  export function newInstance(initialValues?: {
    contourValue?: number;
    computeNormals?: boolean;
    mergePoints?: boolean;
  }): vtkImageMarchingCubes;

  const vtkImageMarchingCubes: {
    newInstance: typeof newInstance;
  };

  export default vtkImageMarchingCubes;
}
