import { ChangeEvent, FC, useEffect, useState } from 'react';
import { createDeliveryClient } from '@kontent-ai/delivery-sdk';

export const IntegrationApp: FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string | null>(null);
  const [selectedItemNames, setSelectedItemNames] = useState<ReadonlyArray<string>>([]);
  const [selectedItemTypes, setSelectedItemTypes]  = useState<ReadonlyArray<string>>([]);
  const [checkboxes, setCheckboxes] = useState<Array<string>>()
  const [checkedBoxes, setCheckedBoxes] = useState<Array<string>>([])
  const [elementValue, setElementValue] = useState<Array<string>>([]);

  useEffect(() => {
    CustomElement.init((element, context) => {
      if (!isConfig(element.config)) {
        throw new Error('Invalid configuration of the custom element. Please check the documentation.');
      }
      setConfig(element.config);
      setProjectId(context.projectId);
      setItemName(context.item.name);
      setElementValue(JSON.parse(element.value) ?? '');
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    CustomElement.setHeight(500);
  }, []);

  useEffect(() => {
    CustomElement.observeItemChanges(i => setItemName(i.name));
  }, []);

  const selectItems = () =>
    CustomElement.selectItems({ allowMultiple: true })
      .then(ids => CustomElement.getItemDetails(ids?.map(i => i.id) ?? []))
      .then(items => 
        {
          setSelectedItemNames(items?.map(item => item.name) ?? [])
          setSelectedItemTypes(items?.map(item => item.type.id) ?? [])
        }
        );

  (async function getType(){
    if(projectId){
      //TODO: abstract delivery client setup for re-use
      const deliveryClient = createDeliveryClient({
      projectId: projectId
      });
  
      const types = await deliveryClient.types().toPromise()
  
      const type = types.data.items.filter(type => type.system.id === selectedItemTypes[0])
      if(type[0]?.system.codename){

        const elementValues = Object.values(type[0].elements)

        let checkboxesArr: Array<string> = []

        // save codename array in state
        elementValues.forEach(element => {
          if(element.codename){
              checkboxesArr.push(`${element.codename} | ${element.name}`)
          }
        });

        setCheckboxes(checkboxesArr)
      }
    }
  })();

  if (!config || !projectId || elementValue === null || itemName === null) {
    return null;
  }

  const handleChecked = (event:ChangeEvent<HTMLInputElement>) => {
    if(event.target.checked){
      const newChecked = [...checkedBoxes, event.target.value]
      setCheckedBoxes(newChecked);
    }
    else {
      const value = checkedBoxes.indexOf(event.target.value)
      //const removeUnchecked = checkedBoxes.filter(box => box !== event.target.value)
      const removeUnchecked = checkedBoxes.splice(value, 1)
      setCheckedBoxes(removeUnchecked)
    }

    CustomElement.setValue(JSON.stringify(checkedBoxes))
    
}

  return (
      <div>
      <h1>
        Select the item that you want to generate a submenu for:
      </h1>
      <section>
      <button onClick={selectItems}>Select different items</button>
        <h3>Selected Item for Sub Menu:</h3>
          {selectedItemNames.join(', ')} Content Item --
          <div>
              <ul>
              {checkboxes && checkboxes.map(box => {
                let checked:boolean = checkedBoxes.includes(box)
                return (
                  <li key={box}>
                    <input type='checkbox' checked={checked} title={box} value={box} onChange={handleChecked}/>element: {box}
                  </li>
                )
              })}
              </ul>
        </div>
        <div>
          <h4>previously checked boxes:</h4> 
          <ul>
          {elementValue && elementValue.map(checkedBox => {
            return (
              <li>
                {checkedBox}
              </li>
            )
          })}
          </ul>
        </div>
      </section>
      </div>
  
  );
};

IntegrationApp.displayName = 'IntegrationApp';

type Config = Readonly<{
  // expected custom element's configuration
  textElementCodename: string;
}>;

// check it is the expected configuration
const isConfig = (v: unknown): v is Config =>
  isObject(v) &&
  hasProperty(nameOf<Config>('textElementCodename'), v) &&
  typeof v.textElementCodename === 'string';

const hasProperty = <PropName extends string, Input extends {}>(propName: PropName, v: Input): v is Input & { [key in PropName]: unknown } =>
  v.hasOwnProperty(propName);

const isObject = (v: unknown): v is {} =>
  typeof v === 'object' &&
  v !== null;

const nameOf = <Obj extends Readonly<Record<string, unknown>>>(prop: keyof Obj) => prop;
