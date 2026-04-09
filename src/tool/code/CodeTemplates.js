const pythonCode =`# Hello World
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

const scheduleCode= `
from viewer import ifc
import pprint as pp

modelName = '5D.ifc'
model = ifc.context.get(modelName)

for schedule in model.by_type('IfcWorkSchedule'):
    print(f"Schedule: {schedule.Name}")
    tasks = ifc.sequence.get_tasks(schedule)
    print(f"Number of tasks: {len(tasks)}")
    print('First task:)
    pp.pprint(tasks[0].get_info())
`

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


const testCode = [
    {
        name: "Hello World",
        code : pythonCode,
        language: "python",
   },
    {
        name: "Task Extraction",
        code : scheduleCode,
    },
    {
        name: "IFC Transaction Example",
        code : ifcTransactionCode,
        language: "python",
    },
]

export { testCode };