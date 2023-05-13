[![Tilia logo][Tilia-Image]](#)

> ### Utilities -> Tilia Package Importer for the Unity Software
> A helper utility window for the Unity software to allow easy importing of Tilia packages

## Introduction

The Tilia Package Importer allows easy import of the [Tilia] packages into the [Unity] software as the default Unity Package Manager only supports the old `all` route for package listing which is no longer supported on npmjs.

## Getting Started

### Opening the Package Importer

Browse to `Main Menu -> Window -> Tilia -> Package Importer` in the Unity software and select the `Package Importer` option.

This will open the `Package Importer` window.

> If you need to refresh the package list, then click the `Refresh Package List` button.

### Adding the required Scoped Registry

If the `io.extendreality` Scoped Registry is not present in the Unity project manifest.json file then a message will appear promting to attempt to add the required scoped registry by clicking the `Add Scoped Registry` button.

When the `io.extendreality` Scoped Registry is present in the Unity project manifest.json file a list of available Tilia packages will be displayed in the `Package Importer` window.

### Adding a Tilia package

Find the required package and click `Add` next to the relevant package to attempt to add that package to your project.

Clicking the `View` button will open the GitHub webpage for the relevant package.

### Filtering the package list

You can filter the list contents by free typing into the `Filter` text box.

### Adding multiple Tilia packages at the same time

If you are using Unity 2021.2 or above, then you will be able to add multiple packages at the same time by ticking the checkbox next to each package you wish you import and then clicking the `Add Selected Packages` button.

## Contributing

Please refer to the Extend Reality [Contributing guidelines] and the [project coding conventions].

## Code of Conduct

Please refer to the Extend Reality [Code of Conduct].

## Third Party Pacakges

The Tilia Package Importer uses the following 3rd party packages:

* [SimpleJSON] by Bunny83.

## License

Code released under the [MIT License][License].

[Tilia-Image]: https://raw.githubusercontent.com/ExtendRealityLtd/related-media/main/github/readme/tilia.png
[License]: LICENSE.md
[project coding conventions]: https://github.com/ExtendRealityLtd/.github/blob/master/CONVENTIONS/UNITY3D.md
[Contributing guidelines]: https://github.com/ExtendRealityLtd/.github/blob/master/CONTRIBUTING.md
[Code of Conduct]: https://github.com/ExtendRealityLtd/.github/blob/master/CODE_OF_CONDUCT.md

[Tilia]: https://www.vrtk.io/tilia.html
[Unity]: https://unity3d.com/
[SimpleJSON]: https://github.com/Bunny83/SimpleJSON