import { Select, Space } from 'antd';
import React, { useEffect, useState } from 'react';
import { get as getRegionApi } from '@/services/api/省市区编码管理/省市区编码管理';

const regionApi = getRegionApi();

type RegionSelectProps = {
  value?: { province?: string; city?: string; district?: string };
  onChange?: (value: { province?: string; city?: string; district?: string }) => void;
};

const RegionSelect: React.FC<RegionSelectProps> = ({ value, onChange }) => {
  const [provinceOptions, setProvinceOptions] = useState<TODO[]>([]);
  const [cityOptions, setCityOptions] = useState<TODO[]>([]);
  const [districtOptions, setDistrictOptions] = useState<TODO[]>([]);

  useEffect(() => {
    regionApi.provinceList1().then((res: TODO) => {
      if (res.code === 200) {
        setProvinceOptions(res.data || []);
      }
    });
  }, []);

  const handleProvinceChange = (regionCode: string) => {
    setCityOptions([]);
    setDistrictOptions([]);
    onChange?.({ province: regionCode, city: undefined, district: undefined });

    regionApi.cityList1({ provinceCode: regionCode } as TODO).then((res: TODO) => {
      if (res.code === 200) {
        setCityOptions(res.data || []);
      }
    });
  };

  const handleCityChange = (cityCode: string) => {
    setDistrictOptions([]);
    onChange?.({ province: value?.province, city: cityCode, district: undefined });
    regionApi.districtList1({ cityCode: cityCode } as TODO).then((res: TODO) => {
      if (res.code === 200) {
        setDistrictOptions(res.data || []);
      }
    });
  };

  const handleDistrictChange = (districtCode: string) => {
    onChange?.({ province: value?.province, city: value?.city, district: districtCode });
  };

  // When province changes externally (e.g. form.setFieldsValue), load city/district options
  useEffect(() => {
    if (value?.province && provinceOptions.length > 0) {
      const province = provinceOptions.find((p: TODO) => p.regionCode === value.province);
      if (province) {
        regionApi.cityList1({ provinceCode: province.regionCode } as TODO).then((res: TODO) => {
          if (res.code === 200) {
            setCityOptions(res.data || []);
          }
        });
      }
    }
  }, [value?.province, provinceOptions]);

  useEffect(() => {
    if (value?.city && cityOptions.length > 0) {
      const city = cityOptions.find((c: TODO) => c.regionCode === value.city);
      if (city) {
        regionApi.districtList1({ cityCode: city.regionCode } as TODO).then((res: TODO) => {
          if (res.code === 200) {
            setDistrictOptions(res.data || []);
          }
        });
      }
    }
  }, [value?.city, cityOptions]);

  return (
    <Space>
      <Select
        placeholder="省"
        value={value?.province}
        onChange={handleProvinceChange}
        options={provinceOptions.map((p: TODO) => ({ label: p.regionName, value: p.regionCode }))}
        style={{ width: 120 }}
      />
      <Select
        placeholder="市"
        value={value?.city}
        onChange={handleCityChange}
        options={cityOptions.map((c: TODO) => ({ label: c.regionName, value: c.regionCode }))}
        style={{ width: 120 }}
      />
      <Select
        placeholder="区"
        value={value?.district}
        onChange={handleDistrictChange}
        options={districtOptions.map((d: TODO) => ({ label: d.regionName, value: d.regionCode }))}
        style={{ width: 120 }}
      />
    </Space>
  );
};

export default RegionSelect;
