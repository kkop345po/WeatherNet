import { Component, OnInit, inject } from '@angular/core';
import { DatePipe } from '@angular/common';

import { HttpClientService } from './@services/http-client.service';


import {
  Weather,
  WeatherElement,
  ElementValue
} from './@interfaces/weather';

interface Forecast {
  time: string;
  temperature?: string;
  apparentTemperature?: string;
  rain?: string;
  humidity?: string;
  windSpeed?: string;
  windDirection?: string;
  comfort?: string;
  weather?: string;
  description?: string;
  icon: string;
}

interface DailyForecast {
  date: string;
  min: number;
  max: number;
}

interface District {
  name: string;
  forecasts: Forecast[];
  days: DailyForecast[];
}

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  private http = inject(HttpClientService);


  private readonly apiUrl = 'https://weathernet-api.kkop345po.workers.dev/api/weather';

  districts: District[] = [];
  selectedIndex = 0;
  selected?: District;

  loading = false;
  errorMessage = '';
  loadedAt?: Date;

  ngOnInit(): void {
    this.loadWeather();
  }

  loadWeather(): void {
    if (this.loading) return;

    this.loading = true;
    this.errorMessage = '';

    this.http.getApi(this.apiUrl).subscribe({
      next: (res: Weather) => {
        const previousName = this.selected?.name;

        this.districts = res.records.Locations.flatMap(group =>
          group.Location.map(location => {
            const elements = location.WeatherElement;

            const temperatures = elements.find(
              element => element.ElementName === '溫度'
            );

            const forecasts: Forecast[] = [];

            for (const item of temperatures?.Time ?? []) {
              const rawTime = item.DataTime ?? item.StartTime;

              if (!rawTime) continue;

              const timestamp = new Date(rawTime).getTime();

              if (!Number.isFinite(timestamp)) continue;

              const time = new Date(timestamp).toISOString();

              const weather = this.valueAt(
                elements, '天氣現象', time
              )?.Weather;

              const comfort = this.valueAt(
                elements, '舒適度指數', time
              )?.ComfortIndexDescription;

              forecasts.push({
                time,

                temperature: this.numeric(
                  item.ElementValue[0]?.Temperature
                ),

                apparentTemperature: this.numeric(
                  this.valueAt(elements, '體感溫度', time)
                    ?.ApparentTemperature
                ),

                rain: this.numeric(
                  this.valueAt(elements, '3小時降雨機率', time)
                    ?.ProbabilityOfPrecipitation,
                  0,
                  100
                ),

                humidity: this.numeric(
                  this.valueAt(elements, '相對濕度', time)
                    ?.RelativeHumidity,
                  0,
                  100
                ),

                windSpeed: this.numeric(
                  this.valueAt(elements, '風速', time)?.WindSpeed,
                  0
                ),

                windDirection: this.valueAt(
                  elements, '風向', time
                )?.WindDirection,

                comfort,

                weather,

                description: this.valueAt(
                  elements, '天氣預報綜合描述', time
                )?.WeatherDescription,

                icon: this.weatherIcon(weather, time)
              });
            }

            forecasts.sort(
              (a, b) =>
                new Date(a.time).getTime() -
                new Date(b.time).getTime()
            );

            return {
              name: location.LocationName,
              forecasts,
              days: this.dailySummary(forecasts)
            };
          })
        );

        const previousIndex = this.districts.findIndex(
          district => district.name === previousName
        );

        this.selectedIndex = previousIndex >= 0 ? previousIndex : 0;
        this.selected = this.districts[this.selectedIndex];

        this.loadedAt = new Date();
        this.loading = false;
      },

      error: (error: unknown) => {
        console.error(error);

        this.errorMessage = '取得天氣資料失敗，請稍後再試。';
        this.loading = false;
      }
    });
  }

  selectDistrict(event: Event): void {
    const select = event.target as HTMLSelectElement;

    this.selectedIndex = Number(select.value);
    this.selected = this.districts[this.selectedIndex];
  }

  // 以目前時間選出第一筆尚未過期的溫度預報
  get overview(): Forecast | undefined {
    const forecasts = this.selected?.forecasts ?? [];
    const now = Date.now();

    return forecasts.find(
      forecast => new Date(forecast.time).getTime() >= now
    );
  }

  // 區間資料使用起訖時間配對，時間點資料則精確配對
  private valueAt(
    elements: WeatherElement[],
    name: string,
    time: string
  ): ElementValue | undefined {
    const element = elements.find(
      item => item.ElementName === name
    );

    const target = new Date(time).getTime();

    const match = element?.Time.find(item => {
      if (item.StartTime && item.EndTime) {
        const start = new Date(item.StartTime).getTime();
        const end = new Date(item.EndTime).getTime();

        return target >= start && target < end;
      }

      return item.DataTime !== undefined &&
        new Date(item.DataTime).getTime() === target;
    });

    return match?.ElementValue[0];
  }

  private numeric(
    value: string | undefined,
    min = -Infinity,
    max = Infinity
  ): string | undefined {
    if (value === undefined || value.trim() === '') {
      return undefined;
    }

    const number = Number(value);

    return Number.isFinite(number) && number >= min && number <= max
      ? value
      : undefined;
  }

  private dailySummary(forecasts: Forecast[]): DailyForecast[] {
    const groups = new Map<string, number[]>();

    for (const forecast of forecasts) {
      if (forecast.temperature === undefined) continue;

      // 轉成臺灣日期，避免以 UTC 日期分組
      const date = new Date(
        new Date(forecast.time).getTime() + 8 * 60 * 60 * 1000
      ).toISOString().slice(0, 10);

      const values = groups.get(date) ?? [];

      values.push(Number(forecast.temperature));
      groups.set(date, values);
    }

    return Array.from(groups, ([date, values]) => ({
      date,
      min: Math.min(...values),
      max: Math.max(...values)
    }));
  }

  private weatherIcon(weather: string | undefined, time: string): string {
    if (!weather) return '🌡️';
    if (weather.includes('雷')) return '⛈️';
    if (weather.includes('雨')) return '🌧️';
    if (weather.includes('雪')) return '🌨️';
    if (weather.includes('霧')) return '🌫️';
    if (weather.includes('陰')) return '☁️';
    if (weather.includes('雲')) return '⛅';

    const hour = new Date(
      new Date(time).getTime() + 8 * 60 * 60 * 1000
    ).getUTCHours();

    return hour >= 6 && hour < 18 ? '☀️' : '🌙';
  }
}
