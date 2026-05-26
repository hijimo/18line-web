import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Form } from 'antd';
import { vi } from 'vitest';
import CoordinateInput from './index';

describe('CoordinateInput', () => {
  it('displays latitude before longitude while preserving field bindings', () => {
    const { container } = render(
      <Form initialValues={{ longitude: 121.180248, latitude: 31.402538 }}>
        <CoordinateInput />
      </Form>,
    );

    const inputs = Array.from(container.querySelectorAll('input'));

    expect(inputs).toHaveLength(2);
    expect(inputs[0]).toHaveAttribute('placeholder', '纬度');
    expect(inputs[0]).toHaveValue('31.402538');
    expect(inputs[1]).toHaveAttribute('placeholder', '经度');
    expect(inputs[1]).toHaveValue('121.180248');
  });

  it('keeps latitude and longitude as the form value contract after edits', async () => {
    const user = userEvent.setup();
    const handleFinish = vi.fn();

    const TestForm = () => {
      const [form] = Form.useForm();

      return (
        <Form form={form}>
          <CoordinateInput />
          <button type="button" onClick={() => handleFinish(form.getFieldsValue())}>
            提交
          </button>
        </Form>
      );
    };

    const { container } = render(<TestForm />);

    const [latitudeInput, longitudeInput] = Array.from(container.querySelectorAll('input'));

    expect(latitudeInput).toHaveAttribute('placeholder', '纬度');
    expect(longitudeInput).toHaveAttribute('placeholder', '经度');

    await user.type(latitudeInput, '31.402538');
    await user.type(longitudeInput, '121.180248');
    await user.click(screen.getByRole('button', { name: '提交' }));

    expect(handleFinish).toHaveBeenCalledWith({
      latitude: 31.402538,
      longitude: 121.180248,
    });
  });
});
