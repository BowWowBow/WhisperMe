package com.example.whisperme.service;

import com.example.whisperme.domain.ChatMessage;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class QuestionRouterService {

    public boolean needSearch(String question) {
        if (question == null || question.trim().isEmpty()) {
            return false;
        }

        String q = question.toLowerCase().trim();

        return q.contains("오늘")
                || q.contains("내일")
                || q.contains("어제")
                || q.contains("요즘")
                || q.contains("최근")
                || q.contains("최신")
                || q.contains("현재")
                || q.contains("실시간")
                || q.contains("뉴스")
                || q.contains("속보")
                || q.contains("정치")
                || q.contains("대통령")
                || q.contains("국회")
                || q.contains("정부")
                || q.contains("경제")
                || q.contains("금리")
                || q.contains("증시")
                || q.contains("사회")
                || q.contains("사건")
                || q.contains("사고")
                || q.contains("월드컵")
                || q.contains("축구")
                || q.contains("야구")
                || q.contains("농구")
                || q.contains("경기 결과")
                || q.contains("스코어")
                || q.contains("순위")
                || q.contains("일정")
                || q.contains("주가")
                || q.contains("주식")
                || q.contains("환율")
                || q.contains("날씨")
                || q.contains("가격")
                || q.contains("병원")
                || q.contains("맛집")
                || q.contains("여행")
                || q.contains("공연")
                || q.contains("영화")
                || q.contains("개봉")
                || q.contains("출시")
                || q.contains("업데이트");
    }

    public String makeSearchKeyword(String question, List<ChatMessage> history) {
        if (question == null || question.trim().isEmpty()) {
            return "오늘 주요 뉴스";
        }

        String q = question.trim();

        if (containsAny(q, "정치", "대통령", "국회", "정부", "선거")) {
            return q + " 최신 정치 뉴스";
        }

        if (containsAny(q, "경제", "금리", "증시", "코스피", "코스닥")) {
            return q + " 최신 경제 뉴스";
        }

        if (containsAny(q, "사회", "사건", "사고", "범죄")) {
            return q + " 최신 사회 뉴스";
        }

        if (containsAny(q, "월드컵", "축구", "야구", "농구", "경기 결과", "스코어")) {
            return q + " 최신 경기 결과 스코어";
        }

        if (containsAny(q, "주가", "주식")) {
            return q + " 최신 주가 뉴스";
        }

        if (containsAny(q, "환율", "달러", "엔화", "원화")) {
            return q + " 오늘 환율";
        }

        if (containsAny(q, "날씨", "기온", "비", "눈", "미세먼지")) {
            return q + " 오늘 날씨";
        }

        if (containsAny(q, "맛집", "카페", "식당")) {
            return q + " 최신 추천 후기";
        }

        if (containsAny(q, "병원", "의원", "피부과", "안과", "치과", "정형외과")) {
            return q + " 최신 정보 후기";
        }

        if (containsAny(q, "여행", "숙소", "호텔", "항공권", "비행기")) {
            return q + " 최신 여행 정보";
        }

        if (containsAny(q, "가격", "최저가", "할인", "구매")) {
            return q + " 최신 가격";
        }

        if (containsAny(q, "영화", "개봉", "공연", "콘서트")) {
            return q + " 최신 일정";
        }

        if (containsAny(q, "뉴스", "속보", "최신", "최근", "현재", "오늘")) {
            return q;
        }

        return q + " 최신";
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