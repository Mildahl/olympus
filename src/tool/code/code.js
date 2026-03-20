const scheduleCode= `
# IFC Transaction Example
from viewer import ifc

def hello(step, project):
    print(f'{step}: {project.Name}')

modelName = '5D.ifc'
model = ifc.context.get(modelName)

for schedule in model.by_type('IfcWorkSchedule'):
    print(schedule)
    tasks = ifc.sequence.get_tasks(schedule)
    print(tasks)    
`
const pythonCode =`# Sample Python Code in AECO
import ifcopenshell
print("Hello from Python in AECO!")

# Access IFC tools via viewer.ifc
from viewer import ifc
print("IFC tools available:", dir(ifc))

# Access world manipulation tools
from viewer import scene, model, placement, notification
print("Scene tools:", dir(scene))
print("Model tools:", dir(model))
`;

const ifcTransactionCode = 
`# IFC Transaction Example
from viewer import ifc

def hello(step, project):
    print(f'{step}: {project.Name}')

modelName = '5D.ifc'
model = ifc.context.get(modelName)

project = model.by_type("IfcProject")[0]
hello("Initial Name", project)

model.begin_transaction()
project.Name = "MBappe"
model.end_transaction()

hello("New Name", project)

model.undo()
hello("After Undo", project)

model.redo()
hello("After Redo", project)

`;

const worldManipulationCode =
`# World Manipulation Example - Create 3D Objects
from viewer import scene, model, placement, notification

# Create a truck
truck = await model.create_truck({
    "position": {"x": -2, "y": 0, "z": 0},
    "scale": 1,
    "cabColor": 0x1a3a4a
})

await truck.rotateWheels(2,1)

# Add to scene
scene.add(truck.object)
`;
const jsCode = `// Sample JavaScript Code in AECO
const simulation = window.aeco
console.log(simulation.tools);
console.log(simulation.data);
console.log(simulation.ops);
console.log(simulation.ui);
// Try: console.log(Object.keys(tools));
`

const testCode = [
    {
        name: "Task Extraction",
        code : scheduleCode,
    },
   {
        name: "Python Sandbox",
        code : pythonCode,
        language: "python",
   },
    {
        name: "IFC Transaction Example",
        code : ifcTransactionCode,
        language: "python",
    },
    {
        name: "World Manipulation Example",
        code : worldManipulationCode,
        language: "python",
    },
]

export { testCode };