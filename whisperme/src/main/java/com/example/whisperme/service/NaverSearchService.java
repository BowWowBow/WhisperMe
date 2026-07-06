package com.example.whisperme.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

@Service
public class NaverSearchService {

    @Value("${naver.client.id}")
    private String clientId;

    @Value("${naver.client.secret}")
    private String clientSecret;

    public String search(String keyword) {
        return searchSmart(keyword, keyword);
    }

    public String searchSmart(String question, String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            keyword = "오늘 주요 뉴스";
        }

        String q = question == null ? "" : question.trim();

        StringBuilder sb = new StringBuilder();

        sb.append("[WhisperMe 검색 결과]\n");
        sb.append("검색어: ").append(keyword).append("\n\n");

        if (containsAny(q, "맛집", "카페", "식당", "병원", "의원", "피부과", "안과", "치과", "장소", "근처", "주변")) {
            sb.append(searchLocal(keyword)).append("\n\n");
            sb.append(searchBlog(keyword)).append("\n\n");
            sb.append(searchWeb(keyword)).append("\n\n");
            return sb.toString();
        }

        if (containsAny(q, "가격", "최저가", "구매", "쇼핑", "제품", "노트북", "폰", "핸드폰", "컴퓨터")) {
            sb.append(searchShop(keyword)).append("\n\n");
            sb.append(searchBlog(keyword)).append("\n\n");
            sb.append(searchWeb(keyword)).append("\n\n");
            return sb.toString();
        }

        if (containsAny(q, "뉴스", "정치", "경제", "사회", "사건", "사고", "대통령", "국회", "주가", "주식", "월드컵", "축구")) {
            sb.append(searchNews(keyword)).append("\n\n");
            sb.append(searchWeb(keyword)).append("\n\n");
            sb.append(searchBlog(keyword)).append("\n\n");
            return sb.toString();
        }

        sb.append(searchWeb(keyword)).append("\n\n");
        sb.append(searchBlog(keyword)).append("\n\n");
        sb.append(searchNews(keyword)).append("\n\n");

        return sb.toString();
    }

    public String searchNews(String keyword) {
        return searchNaver(keyword, "news", "뉴스", "date");
    }

    public String searchWeb(String keyword) {
        return searchNaver(keyword, "webkr", "웹문서", "sim");
    }

    public String searchBlog(String keyword) {
        return searchNaver(keyword, "blog", "블로그", "date");
    }

    public String searchLocal(String keyword) {
        return searchNaver(keyword, "local", "지역검색", "random");
    }

    public String searchShop(String keyword) {
        return searchNaver(keyword, "shop", "쇼핑", "sim");
    }

    private String searchNaver(String keyword, String type, String label, String sort) {
        try {
            String finalKeyword = makeBetterKeyword(keyword);
            String query = URLEncoder.encode(finalKeyword, StandardCharsets.UTF_8);

            String url = "https://openapi.naver.com/v1/search/" + type + ".json?query="
                    + query
                    + "&display=5"
                    + "&start=1"
                    + "&sort=" + sort;

            HttpHeaders headers = new HttpHeaders();
            headers.set("X-Naver-Client-Id", clientId);
            headers.set("X-Naver-Client-Secret", clientSecret);

            HttpEntity<Void> entity = new HttpEntity<>(headers);
            RestTemplate restTemplate = new RestTemplate();

            ResponseEntity<String> response = restTemplate.exchange(
                    url,
                    HttpMethod.GET,
                    entity,
                    String.class
            );

            ObjectMapper mapper = new ObjectMapper();
            JsonNode root = mapper.readTree(response.getBody());
            JsonNode items = root.get("items");

            if (items == null || !items.isArray() || items.size() == 0) {
                return "[네이버 " + label + " 검색 결과]\n검색 결과가 없습니다.";
            }

            StringBuilder sb = new StringBuilder();
            sb.append("[네이버 ").append(label).append(" 검색 결과]\n");

            int index = 1;

            for (JsonNode item : items) {
                String title = clean(getText(item, "title"));
                String description = clean(getText(item, "description"));
                String link = getText(item, "originallink");

                if (link == null || link.isBlank()) {
                    link = getText(item, "link");
                }

                sb.append("[검색결과 ").append(index).append("]\n");
                sb.append("제목: ").append(title).append("\n");

                if (!description.isBlank()) {
                    sb.append("내용: ").append(description).append("\n");
                }

                String address = clean(getText(item, "address"));
                String roadAddress = clean(getText(item, "roadAddress"));
                String telephone = clean(getText(item, "telephone"));

                if (!roadAddress.isBlank()) {
                    sb.append("도로명주소: ").append(roadAddress).append("\n");
                }

                if (!address.isBlank()) {
                    sb.append("주소: ").append(address).append("\n");
                }

                if (!telephone.isBlank()) {
                    sb.append("전화번호: ").append(telephone).append("\n");
                }

                String lprice = getText(item, "lprice");
                String mallName = clean(getText(item, "mallName"));

                if (!lprice.isBlank()) {
                    sb.append("최저가: ").append(lprice).append("원\n");
                }

                if (!mallName.isBlank()) {
                    sb.append("판매처: ").append(mallName).append("\n");
                }

                String pubDate = getText(item, "pubDate");
                String postDate = getText(item, "postdate");

                if (!pubDate.isBlank()) {
                    sb.append("날짜: ").append(pubDate).append("\n");
                }

                if (!postDate.isBlank()) {
                    sb.append("작성일: ").append(postDate).append("\n");
                }

                if (link != null && !link.isBlank()) {
                    sb.append("링크: ").append(link).append("\n");
                }

                sb.append("\n");
                index++;
            }

            return sb.toString();

        } catch (Exception e) {
            e.printStackTrace();
            return "[네이버 " + label + " 검색 결과]\n검색 실패";
        }
    }

    private String makeBetterKeyword(String keyword) {
        if (keyword == null || keyword.trim().isEmpty()) {
            return "오늘 주요 뉴스";
        }

        String text = keyword.trim();

        if (text.contains("삼성전자") && (text.contains("주가") || text.contains("주식"))) {
            return "삼성전자 주가 현재";
        }

        if (text.contains("주가") || text.contains("주식")) {
            return text + " 현재";
        }

        if (text.contains("날씨")) {
            return text + " 현재";
        }

        if (text.contains("월드컵")) {
            return text + " 최신 결과";
        }

        if (text.contains("맛집") || text.contains("병원") || text.contains("카페")) {
            return text;
        }

        if (text.contains("가격") || text.contains("쇼핑") || text.contains("구매")) {
            return text;
        }

        if (text.contains("오늘") || text.contains("최신") || text.contains("현재")) {
            return text;
        }

        return text + " 최신";
    }

    private String getText(JsonNode item, String fieldName) {
        if (item == null || item.get(fieldName) == null || item.get(fieldName).isNull()) {
            return "";
        }

        return item.get(fieldName).asText();
    }

    private String clean(String text) {
        if (text == null) {
            return "";
        }

        return text
                .replaceAll("<[^>]*>", "")
                .replace("&quot;", "\"")
                .replace("&amp;", "&")
                .replace("&lt;", "<")
                .replace("&gt;", ">")
                .replace("&apos;", "'")
                .replace("&#39;", "'")
                .replace("&nbsp;", " ")
                .replaceAll("\\s+", " ")
                .trim();
    }

    private boolean containsAny(String text, String... keywords) {
        if (text == null) {
            return false;
        }

        for (String keyword : keywords) {
            if (text.contains(keyword)) {
                return true;
            }
        }

        return false;
    }
}