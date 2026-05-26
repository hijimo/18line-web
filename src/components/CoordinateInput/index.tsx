import { Form, Input } from 'antd';
import type { NamePath } from 'antd/es/form/interface';
import type { ClipboardEvent, FC, FocusEvent } from 'react';
import {
  normalizeCoordinateValue,
  parseCoordinatePair,
  validateLatitude,
  validateLongitude,
} from './coordinateUtils';
import styles from './index.module.css';

type CoordinateInputProps = {
  longitudeName?: NamePath;
  latitudeName?: NamePath;
  label?: string;
};

const hasPairSeparator = (value: string) => /[,，\s]/.test(value.trim());

const CoordinateInput: FC<CoordinateInputProps> = ({
  longitudeName = 'longitude',
  latitudeName = 'latitude',
  label = '经纬度',
}) => {
  const form = Form.useFormInstance();
  const longitude = Form.useWatch(longitudeName, form);
  const latitude = Form.useWatch(latitudeName, form);

  const longitudeError = !validateLongitude(longitude) ? '经度范围应为 -180 到 180' : '';
  const latitudeError = !validateLatitude(latitude) ? '纬度范围应为 -90 到 90' : '';
  const error = longitudeError || latitudeError;

  const setPair = (text: string): boolean => {
    const parsed = parseCoordinatePair(text);
    if (!parsed) {
      return false;
    }

    form.setFields([
      { name: longitudeName, value: parsed.longitude, errors: [] },
      { name: latitudeName, value: parsed.latitude, errors: [] },
    ]);
    return true;
  };

  const normalizeSingleValue = (name: NamePath, value: unknown) => {
    const normalized = normalizeCoordinateValue(value);
    if (normalized !== undefined || value === '' || value === undefined || value === null) {
      form.setFieldValue(name, normalized);
    }
  };

  const createPasteHandler = () => (event: ClipboardEvent<HTMLInputElement>) => {
    const pastedText = event.clipboardData.getData('text');
    if (setPair(pastedText)) {
      event.preventDefault();
    }
  };

  const createValueFromEvent = (name: NamePath) => (event: { target: { value: string } }) => {
    const nextValue = event.target.value;
    if (hasPairSeparator(nextValue) && setPair(nextValue)) {
      const parsed = parseCoordinatePair(nextValue);
      return name === longitudeName ? parsed?.longitude : parsed?.latitude;
    }

    return nextValue;
  };

  const createBlurHandler = (name: NamePath) => (event: FocusEvent<HTMLInputElement>) => {
    normalizeSingleValue(name, event.target.value);
  };

  return (
    <div className={styles.coordinateField}>
      <div className={styles.label}>{label}</div>
      <div className={styles.compact}>
        <Form.Item
          className={`${styles.item} ${styles.latitude}`}
          name={latitudeName}
          validateStatus={latitudeError ? 'error' : undefined}
          getValueFromEvent={createValueFromEvent(latitudeName)}
          rules={[
            {
              validator: (_, value) =>
                validateLatitude(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error('纬度范围应为 -90 到 90')),
            },
          ]}
          noStyle={false}
        >
          <Input
            inputMode="decimal"
            placeholder="纬度"
            onBlur={createBlurHandler(latitudeName)}
            onPaste={createPasteHandler()}
          />
        </Form.Item>
        <span className={styles.separator}>,</span>
        <Form.Item
          className={`${styles.item} ${styles.longitude}`}
          name={longitudeName}
          validateStatus={longitudeError ? 'error' : undefined}
          getValueFromEvent={createValueFromEvent(longitudeName)}
          rules={[
            {
              validator: (_, value) =>
                validateLongitude(value)
                  ? Promise.resolve()
                  : Promise.reject(new Error('经度范围应为 -180 到 180')),
            },
          ]}
          noStyle={false}
        >
          <Input
            inputMode="decimal"
            placeholder="经度"
            onBlur={createBlurHandler(longitudeName)}
            onPaste={createPasteHandler()}
          />
        </Form.Item>
      </div>
      <div className={`${styles.hint} ${error ? styles.error : ''}`}>
        {error || '可直接粘贴坐标，例如：31.402538,121.180248'}
      </div>
    </div>
  );
};

export default CoordinateInput;
