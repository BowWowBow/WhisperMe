package com.example.whisperme.controller;

import org.springframework.web.bind.annotation.*;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@RestController
@RequestMapping("/api/weather")
@CrossOrigin(origins = "http://localhost:5173")
public class WeatherController {

    @GetMapping
    public Map<String, Object> weather(@RequestParam double latitude,
                                       @RequestParam double longitude) {

        String url = "https://api.open-meteo.com/v1/forecast"
                + "?latitude=" + latitude
                + "&longitude=" + longitude
                + "&current_weather=true"
                + "&timezone=auto";

        RestTemplate restTemplate = new RestTemplate();

        return restTemplate.getForObject(url, Map.class);
    }

    @GetMapping("/gimhae")
    public Map<String, Object> gimhaeWeather() {

        String url = "https://api.open-meteo.com/v1/forecast"
                + "?latitude=35.2285"
                + "&longitude=128.8893"
                + "&current_weather=true"
                + "&timezone=Asia/Seoul";

        RestTemplate restTemplate = new RestTemplate();

        return restTemplate.getForObject(url, Map.class);
    }
}