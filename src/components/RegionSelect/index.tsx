import React, { useEffect, useState } from 'react';
import { Select, Space } from 'antd';
import { get as getRegionApi } from '@/services/api/省市区编码管理/省市区编码管理';

const regionApi = getRegionApi();

interface RegionSelectProps {
  value?: { province?: string; city?: string; district?: string };
  onChange?: (value: { province?: string; city?: string; district?: string }) => void;
}

const RegionSelect: React.FC<RegionSelectProps> = ({ value, onChange }) => {
  const [provinceOptions, setProvinceOptions] = useState<any[]>([]);
  const [cityOptions, setCityOptions] = useState<any[]>([]);
  const [districtOptions, setDistrictOptions] = useState<any[]>([]);

  useEffect(() => {
    regionApi.provinceList().then((res: any) => {
      if (res.code === 200) {
        setProvinceOptions(res.data || []);
      }
    });
  }, []);

  const handleProvinceChange = (regionCode: string) => {
    setCityOptions([]);
    setDistrictOptions([]);
    onChange?.({ province: regionCode, city: undefined, district: undefined });
    
    regionApi.cityList({ provinceCode: regionCode } as any).then((res: any) => {
      if (res.code === 200) {
        setCityOptions(res.data || []);
      }
    });
    
  };

  const handleCityChange = (cityCode: string) => {
    setDistrictOptions([]);
    onChange?.({ province: value?.province, city: cityCode, district: undefined });
      regionApi.districtList({ cityCode: cityCode} as any).then((res: any) => {
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
      const province = provinceOptions.find((p: any) => p.regionCode === value.province);
      if (province) {
        regionApi.cityList({ provinceCode: province.regionCode } as any).then((res: any) => {
          if (res.code === 200) {
            setCityOptions(res.data || []);
          }
        });
      }
    }
  }, [value?.province, provinceOptions]);

  useEffect(() => {
    if (value?.city && cityOptions.length > 0) {
      const city = cityOptions.find((c: any) => c.regionCode === value.city);
      if (city) {
        regionApi.districtList({ cityCode: city.regionCode } as any).then((res: any) => {
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
        options={provinceOptions.map((p: any) => ({ label: p.regionName, value: p.regionCode }))}
        style={{ width: 120 }}
      />
      <Select
        placeholder="市"
        value={value?.city}
        onChange={handleCityChange}
        options={cityOptions.map((c: any) => ({ label: c.regionName, value: c.regionCode }))}
        style={{ width: 120 }}
      />
      <Select
        placeholder="区"
        value={value?.district}
        onChange={handleDistrictChange}
        options={districtOptions.map((d: any) => ({ label: d.regionName, value: d.regionCode }))}
        style={{ width: 120 }}
      />
    </Space>
  );
};

export default RegionSelect;