import { ChangeEvent, FC, useCallback, useEffect, useState } from 'react';
import { createDeliveryClient } from '@kontent-ai/delivery-sdk';

export const IntegrationApp: FC = () => {
  const [config, setConfig] = useState<Config | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);
  const [itemName, setItemName] = useState<string | null>(null);
  const [itemCodename, setItemCodename] = useState<string | null>(null);
  const [watchedElementValue, setWatchedElementValue] = useState<string | null>(null);
  const [selectedItemNames, setSelectedItemNames] = useState<ReadonlyArray<string>>([]);
  const [selectedItemTypes, setSelectedItemTypes]  = useState<ReadonlyArray<string>>([]);
  const [checkboxes, setCheckboxes] = useState<Array<string>>()
  const [checkedBoxes, setCheckedBoxes] = useState<Array<string>>([])
  const [previouslyCheckedBoxes, setpreviouslyCheckedBoxes] = useState<Array<string>>()
  const [isLoading, setIsLoading] = useState<Boolean>(true)
  const [elementValue, setElementValue] = useState<string | null>(null);

  const updateWatchedElementValue = useCallback((codename: string) => {
    CustomElement.getElementValue(codename, v => typeof v === 'string' && setWatchedElementValue(v));
  }, []);

  useEffect(() => {
    CustomElement.init((element, context) => {
      if (!isConfig(element.config)) {
        throw new Error('Invalid configuration of the custom element. Please check the documentation.');
      }
      setConfig(element.config);
      setProjectId(context.projectId);
      setItemName(context.item.name);
      setItemCodename(context.item.codename)
      setElementValue(element.value ?? '');
      updateWatchedElementValue(element.config.textElementCodename);
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [updateWatchedElementValue]);

  function getExistingChecked(codename:string){
    //API logic to get existing checked boxes
    async function getCheckboxes(codename:string){
      //TODO: abstract delivery client setup for re-use
      if(projectId){
        const deliveryClient = createDeliveryClient({
        projectId: projectId
        });

        //TODO: make element codename dynamic - from config
        await deliveryClient.item(codename)
        .elementsParameter(['custom_sub_menu'])
        .toPromise()
        .then(res => {
          //setpreviouslyCheckedBoxes(res.data.item.elements[0]?.value)
          setpreviouslyCheckedBoxes(['test', 'test2', 'test3'])
          setIsLoading(false)
        });
      }
    };
    
    getCheckboxes(codename);

  }

  useEffect(() => {
    if(itemCodename){
      getExistingChecked(itemCodename)
      }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

  useEffect(() => {
    CustomElement.setHeight(500);
  }, []);

  useEffect(() => {
    CustomElement.observeItemChanges(i => setItemName(i.name));
  }, []);

  useEffect(() => {
    if (!config) {
      return;
    }
    CustomElement.observeElementChanges([config.textElementCodename], () => updateWatchedElementValue(config.textElementCodename));
  }, [config, updateWatchedElementValue]);

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
              checkboxesArr.push(element.codename)
          }
        });

        setCheckboxes(checkboxesArr)
      }
    }
  })();

  if (!config || !projectId || elementValue === null || watchedElementValue === null || itemName === null) {
    return null;
  }

  const handleChecked = (event:ChangeEvent<HTMLInputElement>) => {
    if(event.target.checked){
      setCheckedBoxes(checkedBoxes => [...checkedBoxes, event.target.value]);
    }
    else {
      const removeUnchecked = checkedBoxes.filter(box => box !== event.target.value)
      setCheckedBoxes(removeUnchecked)
    }

    CustomElement.setValue(JSON.stringify(checkedBoxes))
    
}

  return (
    <>
      {isLoading ? <div>isLoading...</div> : 
      <div>
      <h1>
        Select the item that you want to generate a submenu for:
        <button onClick={selectItems}>Select different items</button>
      </h1>
      <section>
        These are your selected item names: {selectedItemNames.join(', ')} -
        - {selectedItemTypes.join(', ')} -
        <ul>
        {checkboxes && checkboxes.map(box => {
          let checked:boolean = checkedBoxes.includes(box)
          return (
            <li>
              <input type='checkbox' checked={checked} title={box} value={box} onChange={handleChecked}/>codename:{box}
            </li>
          )
        })}
        </ul>
        <div>Current item codename: {itemCodename}</div>
        <div>Checked Boxes: {checkedBoxes}</div>
        <div>previously checked boxes: {previouslyCheckedBoxes}</div>

      </section>
      </div>
    }
    </>
  
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
