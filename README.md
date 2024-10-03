# T-Shirt Customizer

![T-Shirt Customizer Banner](public/vite.svg)

## Table of Contents

- [Introduction](#introduction)
- [Features](#features)
- [Demo](#demo)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [Customization](#customization)
- [Contributing](#contributing)
- [License](#license)
- [Acknowledgements](#acknowledgements)

## Introduction

Welcome to the **T-Shirt Customizer**, a cutting-edge web application that empowers users to design and personalize their own T-shirts in a fully interactive 3D environment. Leveraging the power of **Three.js**, **Bootstrap**, and **Vite**, this application provides a seamless and intuitive interface for adding, editing, and manipulating text and images on a customizable T-shirt model.

Whether you're looking to create unique apparel for personal use, events, or your brand, the T-Shirt Customizer offers a robust set of tools to bring your creative visions to life.

## Features

- **3D Visualization:** Real-time rendering of a T-shirt model, allowing users to see their designs from all angles.
- **Text Customization:**
  - Add multiple text elements (up to 4).
  - Edit content, font size, color, alignment, scaling, and rotation.
  - Duplicate and delete text elements.
- **Image Customization:**
  - Upload and place images (up to 3).
  - Resize, rotate, scale, and duplicate images.
  - Drag-and-drop positioning on the T-shirt.
- **Theme Modes:**
  - System default, time-based (auto), light, and dark themes.
  - Toggle between different color schemes seamlessly.
- **View Settings:**
  - **Wireframe Mode:** Toggle wireframe view for design precision.
  - **Grid Overlay:** Display a grid to aid in element alignment.
  - **Shadows:** Enable or disable shadows for depth perception.
  - **Lighting Controls:** Manage ambient, directional, and spotlight visibility.
  - **Model Visibility:** Show or hide the T-shirt model as needed.
  - **UV Map Overlay:** Overlay the UV map for detailed texture editing.
- **Animation:** Rotate the T-shirt model automatically to showcase designs.
- **Responsive Design:** Optimized for various screen sizes, ensuring a consistent experience across devices.
- **Interactive Editor Canvas:** Visual canvas for arranging text and image elements with real-time updates on the 3D model.

## Demo

![T-Shirt Customizer Demo](public/demo.gif)

*Note: Replace the above image link with an actual demo GIF or screenshot showcasing the application's functionality.*

## Technologies Used

- **[Vite](https://vitejs.dev/):** Fast and modern frontend build tool for a seamless development experience.
- **[Three.js](https://threejs.org/):** JavaScript 3D library used for rendering the interactive T-shirt model.
- **[Bootstrap 5](https://getbootstrap.com/):** CSS framework for responsive and modern UI components.
- **[Bootstrap Icons](https://icons.getbootstrap.com/):** Icon library for intuitive visual cues.
- **[Fabric.js](http://fabricjs.com/):** HTML5 canvas library (included but can be leveraged for advanced canvas manipulations).
- **[GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader):** Loader for importing 3D models in GLTF format.

## Installation

Follow these steps to set up and run the T-Shirt Customizer locally:

1. **Clone the Repository**

   ```bash
   git clone https://github.com/your-username/menbun-3d.git
   cd menbun-3d
   ```

2. **Install Dependencies**

   Ensure you have [Node.js](https://nodejs.org/) installed. Then, install the required packages:

   ```bash
   npm install
   ```

3. **Run the Development Server**

   Start the Vite development server:

   ```bash
   npm run dev
   ```

4. **Access the Application**

   Open your browser and navigate to `http://localhost:5173` (or the URL provided in the terminal) to access the T-Shirt Customizer.

## Usage

1. **Customize Theme Mode**

   - Use the **Theme Mode** dropdown to switch between system default, time-based, light, and dark themes.

2. **Select T-Shirt Color**

   - Choose your desired T-shirt color using the color picker.

3. **Add Text**

   - Enter your desired text in the **Add Text** input field.
   - Adjust the font size using the slider.
   - Click **Add Text** to place the text on the T-shirt.
   - Select a text element from the **Properties** panel to edit its content, size, color, scale, rotation, or duplicate it.

4. **Upload Image**

   - Click **Upload Image** to select an image from your device.
   - After uploading, click **Add Image** to place it on the T-shirt.
   - Select an image from the **Properties** panel to resize, rotate, scale, or duplicate it.

5. **Position Elements**

   - Drag and drop text and image elements directly on the **Editor Canvas** to position them accurately on the T-shirt.

6. **View Settings**

   - Toggle **Wireframe**, **Grid**, **Shadows**, and various **Lighting** options to customize the 3D view.
   - Use the **UV Map Overlay** to assist in detailed texture editing.

7. **Animate Model**

   - Click **Animate** to start or stop the automatic rotation of the T-shirt model, providing a dynamic view of your design.

8. **Responsive Controls**

   - On smaller screens, use the **Customize** button to toggle the visibility of the control panel.

## Project Structure

```
menbun-3d/
├── public/
│   └── vite.svg
├── src/
│   ├── models/
│   │   ├── jersey.glb
│   │   └── UV.png
│   └── main.js
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
└── README.md
```

- **public/**: Contains static assets like images and icons.
- **src/**: Source code for the application.
  - **models/**: 3D models and related assets used in the project.
  - **main.js**: Primary JavaScript file handling application logic and Three.js interactions.
- **index.html**: Entry point of the application, including the UI structure and links to stylesheets and scripts.
- **package.json**: Project metadata and dependencies.
- **.gitignore**: Specifies intentionally untracked files to ignore.
- **README.md**: Documentation for the project.

## Customization

### Adding More Features

To enhance the T-Shirt Customizer, consider implementing the following features:

- **Advanced Text Editing:**
  - Change font family and style.
  - Add text outlines or shadows.
- **Layer Management:**
  - Arrange the stacking order of text and image elements.
- **Color Gradients:**
  - Apply gradient colors to text and images.
- **Export Options:**
  - Allow users to export their designs as high-resolution images or PDFs.
- **User Authentication:**
  - Enable users to save and load their designs by creating accounts.
- **Social Sharing:**
  - Integrate social media sharing options for users to showcase their designs.

### Extending the Codebase

- **Modularization:**
  - Break down `main.js` into smaller modules for better maintainability.
- **State Management:**
  - Implement a state management solution (e.g., Redux) for handling complex interactions.
- **Performance Optimization:**
  - Optimize rendering performance for smoother interactions on lower-end devices.
- **Accessibility Improvements:**
  - Enhance keyboard navigation and ARIA attributes to make the application more accessible.

## Contributing

Contributions are welcome! Follow these steps to contribute to the project:

1. **Fork the Repository**

   Click the **Fork** button at the top-right corner of the repository page to create your own fork.

2. **Clone Your Fork**

   ```bash
   git clone https://github.com/your-username/menbun-3d.git
   cd menbun-3d
   ```

3. **Create a New Branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

4. **Make Your Changes**

   Implement your feature or fix bugs as needed.

5. **Commit Your Changes**

   ```bash
   git commit -m "Add your detailed description of the changes"
   ```

6. **Push to Your Fork**

   ```bash
   git push origin feature/your-feature-name
   ```

7. **Create a Pull Request**

   Navigate to the original repository and click **Compare & pull request** to submit your contributions.

### Guidelines

- **Code Quality:** Ensure your code follows best practices and is well-documented.
- **Commit Messages:** Write clear and descriptive commit messages.
- **Testing:** Test your changes thoroughly before submitting.
- **Respectful Communication:** Engage respectfully with other contributors and maintainers.

## License

This project is [MIT](LICENSE) licensed. Feel free to use, modify, and distribute it as per the license terms.

## Acknowledgements

- **[Three.js](https://threejs.org/):** For providing a powerful 3D library.
- **[Bootstrap](https://getbootstrap.com/):** For the responsive and stylish UI components.
- **[Vite](https://vitejs.dev/):** For the blazing-fast development environment.
- **[Bootstrap Icons](https://icons.getbootstrap.com/):** For the extensive icon library.
- **[GLTFLoader](https://threejs.org/docs/#examples/en/loaders/GLTFLoader):** For loading 3D models seamlessly.
- **[Fabric.js](http://fabricjs.com/):** For canvas manipulation (if utilized).

---

*Feel free to customize this README further to better fit the specific nuances and requirements of your project.*