export default function (plop) {
  // create your generators here
  plop.setGenerator('component', {
    description: 'common component generation',
    prompts: [
      {
        type: 'input',
        name: 'componentName',
        message: 'What should the component be called?',
      },
    ],
    actions: [
      // create component file
      {
        type: 'add',
        path: 'src/components/{{kebabCase componentName}}/{{kebabCase componentName}}.tsx',
        templateFile: 'plop-templates/component/component.tsx.hbs',
      },
      // create component index file
      {
        type: 'add',
        path: 'src/components/{{kebabCase componentName}}/index.ts',
        templateFile: 'plop-templates/component/index.ts.hbs',
      },
      // create component stories file
      {
        type: 'add',
        path: 'src/components/{{kebabCase componentName}}/{{kebabCase componentName}}.stories.tsx',
        templateFile: 'plop-templates/component/component.stories.tsx.hbs',
      },
      // create component md file
      {
        type: 'add',
        path: 'src/components/{{kebabCase componentName}}/{{kebabCase componentName}}.mdx',
        templateFile: 'plop-templates/component/component.mdx.hbs',
      },
      // append component to components index file
      {
        type: 'append',
        path: 'src/components/index.ts',
        template: `export * from "./{{kebabCase componentName}}"`,
      },
    ],
  })
}
